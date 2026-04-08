// Script to seed the database with historical data from Excel files
// Usage: DATABASE_URL=postgres://... node scripts/seed-data.js

const { neon } = require("@neondatabase/serverless");
const XLSX = require("xlsx");
const path = require("path");

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("ERROR: Set DATABASE_URL environment variable");
  process.exit(1);
}

const sql = neon(DATABASE_URL);

// File paths
const FILES = {
  "2025": path.resolve("C:/Users/Lucas/OneDrive/Desktop/Formedica contabildiade 2026/Resultado Formedica 2025.xlsx"),
  "JAN2026": path.resolve("C:/Users/Lucas/Downloads/caixa JAN 2026.xlsx"),
  "FEV2026": path.resolve("C:/Users/Lucas/OneDrive/Desktop/caixa FEV 2026.xlsx"),
};

const MONTH_SHEETS_2025 = [
  { sheet: "JUNHO", monthYear: "2025-06" },
  { sheet: "JULHO", monthYear: "2025-07" },
  { sheet: "AGOSTO", monthYear: "2025-08" },
  { sheet: "SETEMBRO", monthYear: "2025-09" },
  { sheet: "OUTUBRO", monthYear: "2025-10" },
  { sheet: "NOVEMBRO", monthYear: "2025-11" },
  { sheet: "DEZEMBRO", monthYear: "2025-12" },
];

// Results from "Resultado JUN-DEZ2025" sheet (pre-extracted)
const RESULTS_2025 = {
  "2025-06": { receita: 656626.50, despesa: 688820.90, lucro: 47805.60, saldo_final: 661173.03 },
  "2025-07": { receita: 735952.50, despesa: 641668.30, lucro: 174284.20, saldo_final: 757700.22 },
  "2025-08": { receita: 708924.80, despesa: 662980.10, lucro: 125944.70, saldo_final: 803856.17 },
  "2025-09": { receita: 703156.27, despesa: 713538.79, lucro: 69617.48, saldo_final: 793677.75 },
  "2025-10": { receita: 744676.00, despesa: 725605.13, lucro: 99070.87, saldo_final: 815896.89 },
  "2025-11": { receita: 680555.10, despesa: 761439.19, lucro: -884.09, saldo_final: 736545.69 },
  "2025-12": { receita: 707346.10, despesa: 732088.11, lucro: 55257.99, saldo_final: 736545.69 },
};

function parseDate(val) {
  if (val instanceof Date) return val;
  if (typeof val === "number") {
    const parsed = XLSX.SSF.parse_date_code(val);
    return new Date(parsed.y, parsed.m - 1, parsed.d);
  }
  return new Date(String(val));
}

function findValue(sheet, searchText) {
  const range = XLSX.utils.decode_range(sheet["!ref"] || "A1");
  for (let r = range.s.r; r <= range.e.r; r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = sheet[XLSX.utils.encode_cell({ r, c })];
      if (cell && typeof cell.v === "string" && cell.v.toLowerCase().includes(searchText.toLowerCase())) {
        for (let vc = c + 1; vc <= Math.min(c + 5, range.e.c); vc++) {
          const valCell = sheet[XLSX.utils.encode_cell({ r, c: vc })];
          if (valCell && typeof valCell.v === "number") return valCell.v;
        }
      }
    }
  }
  return 0;
}

async function insertMonth(monthYear, fileName, entries, resumo, caixa) {
  console.log(`\n--- ${monthYear} (${entries.length} lançamentos) ---`);

  // Delete existing
  const existing = await sql`SELECT id FROM months WHERE month_year = ${monthYear}`;
  if (existing.length > 0) {
    const id = existing[0].id;
    await sql`DELETE FROM category_summary WHERE month_id = ${id}`;
    await sql`DELETE FROM entries WHERE month_id = ${id}`;
    await sql`DELETE FROM ai_analyses WHERE month_id = ${id}`;
    await sql`DELETE FROM months WHERE id = ${id}`;
    console.log(`  Dados antigos removidos`);
  }

  const margem = resumo.receita > 0 ? resumo.lucro / resumo.receita : 0;
  const recebiveis = (caixa.getnet || 0) + (caixa.stone || 0) + (caixa.cielo || 0);

  const monthResult = await sql`
    INSERT INTO months (month_year, file_name, receita_total, despesa_total, lucro_liquido, margem_liquida, saldo_anterior, saldo_final, caixa_dinheiro, caixa_banco, caixa_cdb, recebiveis_cartao)
    VALUES (${monthYear}, ${fileName}, ${resumo.receita}, ${resumo.despesa}, ${resumo.lucro}, ${margem}, ${caixa.saldo_anterior || 0}, ${caixa.saldo_final || resumo.lucro}, ${caixa.dinheiro || 0}, ${caixa.banco || 0}, ${caixa.cdb || 0}, ${recebiveis})
    RETURNING id
  `;
  const monthId = monthResult[0].id;
  console.log(`  Month ID: ${monthId}`);

  // Insert entries
  let inserted = 0;
  for (const e of entries) {
    const dateStr = e.data.toISOString().split("T")[0];
    await sql`
      INSERT INTO entries (month_id, data, tipo, categoria, subcategoria, descricao, valor)
      VALUES (${monthId}, ${dateStr}, ${e.tipo}, ${e.categoria}, ${e.subcategoria}, ${e.descricao}, ${e.valor})
    `;
    inserted++;
  }
  console.log(`  ${inserted} lançamentos inseridos`);

  // Category summary
  const catMap = new Map();
  entries.filter(e => e.tipo === "Despesa").forEach(e => {
    catMap.set(e.subcategoria, (catMap.get(e.subcategoria) || 0) + e.valor);
  });
  for (const [sub, total] of catMap) {
    const pct = resumo.receita > 0 ? total / resumo.receita : 0;
    await sql`
      INSERT INTO category_summary (month_id, subcategoria, total, percentual_receita)
      VALUES (${monthId}, ${sub}, ${total}, ${pct})
    `;
  }
  console.log(`  ${catMap.size} categorias`);
  console.log(`  Receita: R$ ${resumo.receita.toLocaleString("pt-BR")}`);
  console.log(`  Despesa: R$ ${resumo.despesa.toLocaleString("pt-BR")}`);
  console.log(`  Lucro: R$ ${resumo.lucro.toLocaleString("pt-BR")}`);
}

function parseEntries(sheet) {
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  const entries = [];
  for (const row of rows) {
    const tipo = String(row["Tipo (Receita/Despesa)"] || "").trim();
    const categoria = String(row["Categoria Principal"] || "").trim();
    const subcategoria = String(row["Subcategoria"] || "").trim();
    const descricao = String(row["Descrição"] || row["Descricao"] || "").trim();
    const valorRaw = row["Valor (R$)"];
    if (!tipo || !categoria) continue;

    const data = parseDate(row["Data"]);
    const valor = typeof valorRaw === "number" ? valorRaw : parseFloat(String(valorRaw).replace(/[^\d.,-]/g, "").replace(",", ".")) || 0;

    entries.push({ data, tipo, categoria, subcategoria, descricao, valor: Math.abs(valor) });
  }
  return entries;
}

function parseCaixa(sheet) {
  if (!sheet) return {};
  return {
    saldo_anterior: findValue(sheet, "Saldo Mês Anterior") || findValue(sheet, "Saldo Mes Anterior"),
    saldo_final: findValue(sheet, "SALDO em") || findValue(sheet, "Saldo em"),
    dinheiro: findValue(sheet, "Dinheiro") + (findValue(sheet, "Caixa ( troco") || findValue(sheet, "Caixa (troco")),
    banco: findValue(sheet, "Banco Santander") || findValue(sheet, "Banco"),
    cdb: findValue(sheet, "CDB"),
    getnet: findValue(sheet, "GET NET") || findValue(sheet, "GETNET"),
    stone: findValue(sheet, "STONE"),
    cielo: findValue(sheet, "CIELO"),
  };
}

function parseResumo(sheet, entries) {
  if (sheet) {
    const receita = findValue(sheet, "Receita Total");
    const despesa = findValue(sheet, "Despesa");
    const lucro = findValue(sheet, "Lucro liq");
    if (receita > 0) return { receita, despesa, lucro };
  }
  // Fallback from entries
  const receita = entries.filter(e => e.tipo === "Receita").reduce((s, e) => s + e.valor, 0);
  const despesa = entries.filter(e => e.tipo === "Despesa").reduce((s, e) => s + e.valor, 0);
  return { receita, despesa, lucro: receita - despesa };
}

async function main() {
  console.log("=== SEED: Formedica Smart Caixa ===\n");

  // Create tables
  console.log("Criando tabelas...");
  await sql`CREATE TABLE IF NOT EXISTS months (
    id SERIAL PRIMARY KEY, month_year VARCHAR(7) NOT NULL UNIQUE, uploaded_at TIMESTAMP DEFAULT NOW(),
    file_name VARCHAR(255), receita_total DECIMAL(12,2), despesa_total DECIMAL(12,2),
    lucro_liquido DECIMAL(12,2), margem_liquida DECIMAL(5,4), saldo_anterior DECIMAL(12,2),
    saldo_final DECIMAL(12,2), caixa_dinheiro DECIMAL(12,2), caixa_banco DECIMAL(12,2),
    caixa_cdb DECIMAL(12,2), recebiveis_cartao DECIMAL(12,2))`;
  await sql`CREATE TABLE IF NOT EXISTS entries (
    id SERIAL PRIMARY KEY, month_id INTEGER REFERENCES months(id) ON DELETE CASCADE,
    data DATE, tipo VARCHAR(10), categoria VARCHAR(100), subcategoria VARCHAR(100),
    descricao VARCHAR(255), valor DECIMAL(12,2))`;
  await sql`CREATE TABLE IF NOT EXISTS category_summary (
    id SERIAL PRIMARY KEY, month_id INTEGER REFERENCES months(id) ON DELETE CASCADE,
    subcategoria VARCHAR(100), total DECIMAL(12,2), percentual_receita DECIMAL(5,4))`;
  await sql`CREATE TABLE IF NOT EXISTS ai_analyses (
    id SERIAL PRIMARY KEY, month_id INTEGER, analysis_type VARCHAR(50),
    prompt_summary TEXT, response TEXT, created_at TIMESTAMP DEFAULT NOW())`;
  console.log("Tabelas OK\n");

  // === 2025 months (Jun-Dec) ===
  console.log("=== Processando 2025 (Jun-Dec) ===");
  const wb2025 = XLSX.readFile(FILES["2025"]);

  for (const { sheet: sheetName, monthYear } of MONTH_SHEETS_2025) {
    const sheet = wb2025.Sheets[sheetName];
    if (!sheet) { console.log(`  Sheet ${sheetName} não encontrada, pulando...`); continue; }

    const entries = parseEntries(sheet);
    const res = RESULTS_2025[monthYear];

    await insertMonth(monthYear, "Resultado Formedica 2025.xlsx", entries, {
      receita: res.receita,
      despesa: res.despesa,
      lucro: res.lucro,
    }, { saldo_final: res.saldo_final });
  }

  // === JAN 2026 ===
  console.log("\n=== Processando JAN 2026 ===");
  const wbJan = XLSX.readFile(FILES["JAN2026"]);
  const janEntries = parseEntries(wbJan.Sheets["Lançamentos Diários"]);
  const janCaixa = parseCaixa(wbJan.Sheets["Composição caixa"]);
  const janResumo = parseResumo(wbJan.Sheets["Composição"], janEntries);

  await insertMonth("2026-01", "caixa JAN 2026.xlsx", janEntries, janResumo, janCaixa);

  // === FEV 2026 ===
  console.log("\n=== Processando FEV 2026 ===");
  const wbFev = XLSX.readFile(FILES["FEV2026"]);
  const fevEntries = parseEntries(wbFev.Sheets["Lançamentos Diários"]);
  const fevCaixa = parseCaixa(wbFev.Sheets["Composição caixa"]);
  const fevResumo = parseResumo(wbFev.Sheets["Composição"], fevEntries);

  await insertMonth("2026-02", "caixa FEV 2026.xlsx", fevEntries, fevResumo, fevCaixa);

  console.log("\n=== SEED CONCLUÍDO! ===");
  console.log("9 meses inseridos: Jun/2025 - Fev/2026");
}

main().catch(err => {
  console.error("ERRO:", err);
  process.exit(1);
});

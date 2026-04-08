import * as XLSX from "xlsx";

export interface ParsedEntry {
  data: Date;
  tipo: string;
  categoria: string;
  subcategoria: string;
  descricao: string;
  valor: number;
}

export interface ParsedCaixaComposition {
  saldo_anterior: number;
  vendas: number;
  despesas: number;
  saldo_final: number;
  dinheiro: number;
  caixa_troco: number;
  banco: number;
  cdb: number;
  getnet: number;
  stone: number;
  cielo: number;
}

export interface ParsedResumo {
  receita_total: number;
  despesa_total: number;
  lucro_liquido: number;
  margem_liquida: number;
}

export interface ParsedExcel {
  entries: ParsedEntry[];
  caixa: ParsedCaixaComposition;
  resumo: ParsedResumo;
}

function findValueInSheet(
  sheet: XLSX.WorkSheet,
  searchText: string
): number {
  const range = XLSX.utils.decode_range(sheet["!ref"] || "A1");
  for (let r = range.s.r; r <= range.e.r; r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = sheet[XLSX.utils.encode_cell({ r, c })];
      if (cell && typeof cell.v === "string" && cell.v.toLowerCase().includes(searchText.toLowerCase())) {
        // Look for value in column D (index 3) or the next columns
        for (let vc = c + 1; vc <= Math.min(c + 5, range.e.c); vc++) {
          const valCell = sheet[XLSX.utils.encode_cell({ r, c: vc })];
          if (valCell && typeof valCell.v === "number") {
            return valCell.v;
          }
        }
      }
    }
  }
  return 0;
}

export function parseExcel(buffer: ArrayBuffer): ParsedExcel {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });

  // Parse "Lançamentos Diários"
  const lancSheet = workbook.Sheets["Lançamentos Diários"];
  const entries: ParsedEntry[] = [];

  if (lancSheet) {
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(lancSheet, { defval: "" });
    for (const row of rows) {
      const data = row["Data"];
      const tipo = String(row["Tipo (Receita/Despesa)"] || "").trim();
      const categoria = String(row["Categoria Principal"] || "").trim();
      const subcategoria = String(row["Subcategoria"] || "").trim();
      const descricao = String(row["Descrição"] || row["Descricao"] || "").trim();
      const valorRaw = row["Valor (R$)"];

      if (!tipo || !categoria) continue;

      let parsedDate: Date;
      if (data instanceof Date) {
        parsedDate = data;
      } else if (typeof data === "number") {
        parsedDate = XLSX.SSF.parse_date_code(data) as unknown as Date;
        const parsed = XLSX.SSF.parse_date_code(data);
        parsedDate = new Date(parsed.y, parsed.m - 1, parsed.d);
      } else {
        parsedDate = new Date(String(data));
      }

      const valor = typeof valorRaw === "number" ? valorRaw : parseFloat(String(valorRaw).replace(/[^\d.,-]/g, "").replace(",", ".")) || 0;

      entries.push({
        data: parsedDate,
        tipo,
        categoria,
        subcategoria,
        descricao,
        valor: Math.abs(valor),
      });
    }
  }

  // Parse "Composição caixa"
  const caixaSheet = workbook.Sheets["Composição caixa"] || workbook.Sheets["Composicao caixa"];
  const caixa: ParsedCaixaComposition = {
    saldo_anterior: 0,
    vendas: 0,
    despesas: 0,
    saldo_final: 0,
    dinheiro: 0,
    caixa_troco: 0,
    banco: 0,
    cdb: 0,
    getnet: 0,
    stone: 0,
    cielo: 0,
  };

  if (caixaSheet) {
    caixa.saldo_anterior = findValueInSheet(caixaSheet, "Saldo Mês Anterior") || findValueInSheet(caixaSheet, "Saldo Mes Anterior");
    caixa.vendas = findValueInSheet(caixaSheet, "Vendas");
    caixa.despesas = findValueInSheet(caixaSheet, "Despesas");
    caixa.saldo_final = findValueInSheet(caixaSheet, "SALDO em") || findValueInSheet(caixaSheet, "Saldo em");
    caixa.dinheiro = findValueInSheet(caixaSheet, "Dinheiro");
    caixa.caixa_troco = findValueInSheet(caixaSheet, "Caixa ( troco") || findValueInSheet(caixaSheet, "Caixa (troco");
    caixa.banco = findValueInSheet(caixaSheet, "Banco Santander") || findValueInSheet(caixaSheet, "Banco");
    caixa.cdb = findValueInSheet(caixaSheet, "CDB");
    caixa.getnet = findValueInSheet(caixaSheet, "GET NET") || findValueInSheet(caixaSheet, "GETNET");
    caixa.stone = findValueInSheet(caixaSheet, "STONE");
    caixa.cielo = findValueInSheet(caixaSheet, "CIELO");
  }

  // Parse "Composição" (resumo)
  const compSheet = workbook.Sheets["Composição"] || workbook.Sheets["Composicao"];
  const resumo: ParsedResumo = {
    receita_total: 0,
    despesa_total: 0,
    lucro_liquido: 0,
    margem_liquida: 0,
  };

  if (compSheet) {
    resumo.receita_total = findValueInSheet(compSheet, "Receita Total");
    resumo.despesa_total = findValueInSheet(compSheet, "Despesa");
    resumo.lucro_liquido = findValueInSheet(compSheet, "Lucro liq");
    const margemVal = findValueInSheet(compSheet, "Margem real liq");
    resumo.margem_liquida = margemVal > 1 ? margemVal / 100 : margemVal;
  }

  // Fallback: calculate from entries if resumo sheets missing
  if (resumo.receita_total === 0 && entries.length > 0) {
    resumo.receita_total = entries
      .filter((e) => e.tipo === "Receita")
      .reduce((sum, e) => sum + e.valor, 0);
  }
  if (resumo.despesa_total === 0 && entries.length > 0) {
    resumo.despesa_total = entries
      .filter((e) => e.tipo === "Despesa")
      .reduce((sum, e) => sum + e.valor, 0);
  }
  if (resumo.lucro_liquido === 0) {
    resumo.lucro_liquido = resumo.receita_total - resumo.despesa_total;
  }
  if (resumo.margem_liquida === 0 && resumo.receita_total > 0) {
    resumo.margem_liquida = resumo.lucro_liquido / resumo.receita_total;
  }

  return { entries, caixa, resumo };
}

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { parseExcel } from "@/lib/parser";

export async function POST(request: NextRequest) {
  try {
    const sql = getDb();
    if (!sql) {
      return NextResponse.json({ error: "DATABASE_URL não configurada. Configure nas variáveis de ambiente da Vercel." }, { status: 503 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const monthYear = formData.get("monthYear") as string;

    if (!file || !monthYear) {
      return NextResponse.json({ error: "Arquivo e mês são obrigatórios" }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const parsed = parseExcel(buffer);

    // Check if month already exists
    const existing = await sql`SELECT id FROM months WHERE month_year = ${monthYear}`;

    if (existing.length > 0) {
      const existingId = existing[0].id;
      // Delete old data
      await sql`DELETE FROM category_summary WHERE month_id = ${existingId}`;
      await sql`DELETE FROM entries WHERE month_id = ${existingId}`;
      await sql`DELETE FROM months WHERE id = ${existingId}`;
    }

    // Insert month
    const recebiveis = parsed.caixa.getnet + parsed.caixa.stone + parsed.caixa.cielo;
    const monthResult = await sql`
      INSERT INTO months (month_year, file_name, receita_total, despesa_total, lucro_liquido, margem_liquida, saldo_anterior, saldo_final, caixa_dinheiro, caixa_banco, caixa_cdb, recebiveis_cartao)
      VALUES (${monthYear}, ${file.name}, ${parsed.resumo.receita_total}, ${parsed.resumo.despesa_total}, ${parsed.resumo.lucro_liquido}, ${parsed.resumo.margem_liquida}, ${parsed.caixa.saldo_anterior}, ${parsed.caixa.saldo_final}, ${parsed.caixa.dinheiro + parsed.caixa.caixa_troco}, ${parsed.caixa.banco}, ${parsed.caixa.cdb}, ${recebiveis})
      RETURNING id
    `;

    const monthId = monthResult[0].id;

    // Insert entries in batches
    for (const entry of parsed.entries) {
      const dateStr = entry.data.toISOString().split("T")[0];
      await sql`
        INSERT INTO entries (month_id, data, tipo, categoria, subcategoria, descricao, valor)
        VALUES (${monthId}, ${dateStr}, ${entry.tipo}, ${entry.categoria}, ${entry.subcategoria}, ${entry.descricao}, ${entry.valor})
      `;
    }

    // Calculate and insert category summaries
    const categorySums = new Map<string, number>();
    for (const entry of parsed.entries) {
      if (entry.tipo === "Despesa") {
        const current = categorySums.get(entry.subcategoria) || 0;
        categorySums.set(entry.subcategoria, current + entry.valor);
      }
    }

    for (const [subcategoria, total] of categorySums) {
      const percentual = parsed.resumo.receita_total > 0 ? total / parsed.resumo.receita_total : 0;
      await sql`
        INSERT INTO category_summary (month_id, subcategoria, total, percentual_receita)
        VALUES (${monthId}, ${subcategoria}, ${total}, ${percentual})
      `;
    }

    return NextResponse.json({
      success: true,
      monthId,
      summary: {
        entries: parsed.entries.length,
        receita: parsed.resumo.receita_total,
        despesa: parsed.resumo.despesa_total,
        lucro: parsed.resumo.lucro_liquido,
      },
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Erro ao processar arquivo: " + (error instanceof Error ? error.message : "Erro desconhecido") },
      { status: 500 }
    );
  }
}

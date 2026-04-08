import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { analyzeWithGemini } from "@/lib/gemini";

export async function POST(request: NextRequest) {
  try {
    const { monthId, prompt: userPrompt } = await request.json();
    const sql = getDb();
    if (!sql) return NextResponse.json({ error: "Banco não configurado" }, { status: 503 });

    // Get month data
    const months = await sql`SELECT * FROM months WHERE id = ${monthId}`;
    if (months.length === 0) {
      return NextResponse.json({ error: "Mês não encontrado" }, { status: 404 });
    }
    const month = months[0];

    // Get entries
    const entries = await sql`SELECT * FROM entries WHERE month_id = ${monthId} ORDER BY data`;

    // Get category summary
    const categories = await sql`SELECT * FROM category_summary WHERE month_id = ${monthId} ORDER BY total DESC`;

    // Build context
    const context = `
Dados financeiros de ${month.month_year}:
- Receita Total: R$ ${Number(month.receita_total).toLocaleString("pt-BR")}
- Despesa Total: R$ ${Number(month.despesa_total).toLocaleString("pt-BR")}
- Lucro Líquido: R$ ${Number(month.lucro_liquido).toLocaleString("pt-BR")}
- Margem Líquida: ${(Number(month.margem_liquida) * 100).toFixed(1)}%
- Saldo Anterior: R$ ${Number(month.saldo_anterior).toLocaleString("pt-BR")}
- Saldo Final: R$ ${Number(month.saldo_final).toLocaleString("pt-BR")}

Composição de despesas por subcategoria:
${categories.map((c: Record<string, unknown>) => `- ${c.subcategoria}: R$ ${Number(c.total).toLocaleString("pt-BR")} (${(Number(c.percentual_receita) * 100).toFixed(1)}% da receita)`).join("\n")}

Total de lançamentos: ${entries.length}
Top 10 maiores despesas:
${entries
  .filter((e: Record<string, unknown>) => e.tipo === "Despesa")
  .sort((a: Record<string, unknown>, b: Record<string, unknown>) => Number(b.valor) - Number(a.valor))
  .slice(0, 10)
  .map((e: Record<string, unknown>) => `- ${e.descricao} (${e.subcategoria}): R$ ${Number(e.valor).toLocaleString("pt-BR")}`)
  .join("\n")}
`;

    const fullPrompt = `${context}\n\nPergunta do usuário: ${userPrompt}`;

    const response = await analyzeWithGemini(fullPrompt);

    // Save to ai_analyses
    await sql`
      INSERT INTO ai_analyses (month_id, analysis_type, prompt_summary, response)
      VALUES (${monthId}, 'chat', ${userPrompt.substring(0, 200)}, ${response})
    `;

    return NextResponse.json({ response });
  } catch (error) {
    console.error("AI analyze error:", error);
    return NextResponse.json({ error: "Erro na análise IA" }, { status: 500 });
  }
}

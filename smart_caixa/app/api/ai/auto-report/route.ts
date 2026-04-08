import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { analyzeWithGemini } from "@/lib/gemini";

export async function POST(request: NextRequest) {
  try {
    const { monthId } = await request.json();
    const sql = getDb();

    const months = await sql`SELECT * FROM months WHERE id = ${monthId}`;
    if (months.length === 0) {
      return NextResponse.json({ error: "Mês não encontrado" }, { status: 404 });
    }
    const month = months[0];

    const entries = await sql`SELECT * FROM entries WHERE month_id = ${monthId} ORDER BY valor DESC`;
    const categories = await sql`SELECT * FROM category_summary WHERE month_id = ${monthId} ORDER BY total DESC`;

    // Calculate CMV and custo pessoal
    const materiasPrimas = entries
      .filter((e: Record<string, unknown>) => e.subcategoria === "Matéria-Prima")
      .reduce((sum: number, e: Record<string, unknown>) => sum + Number(e.valor), 0);
    const embalagens = entries
      .filter((e: Record<string, unknown>) => e.subcategoria === "Embalagens")
      .reduce((sum: number, e: Record<string, unknown>) => sum + Number(e.valor), 0);
    const cmv = Number(month.receita_total) > 0 ? (materiasPrimas + embalagens) / Number(month.receita_total) : 0;

    const salarios = entries
      .filter((e: Record<string, unknown>) => ["Salários e Encargos", "Comissões", "Pró-Labore"].includes(String(e.subcategoria)))
      .reduce((sum: number, e: Record<string, unknown>) => sum + Number(e.valor), 0);
    const custoPessoal = Number(month.receita_total) > 0 ? salarios / Number(month.receita_total) : 0;

    // Top 5 despesas
    const topDespesas = entries
      .filter((e: Record<string, unknown>) => e.tipo === "Despesa")
      .slice(0, 5)
      .map((e: Record<string, unknown>) => `${e.descricao} (${e.subcategoria}): R$ ${Number(e.valor).toLocaleString("pt-BR")}`);

    // Top 5 fornecedores
    const fornecedorMap = new Map<string, number>();
    entries
      .filter((e: Record<string, unknown>) => e.tipo === "Despesa")
      .forEach((e: Record<string, unknown>) => {
        const desc = String(e.descricao);
        fornecedorMap.set(desc, (fornecedorMap.get(desc) || 0) + Number(e.valor));
      });
    const topFornecedores = Array.from(fornecedorMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, total]) => `${name}: R$ ${total.toLocaleString("pt-BR")}`);

    const prompt = `Analise os dados financeiros de ${month.month_year} da Formedica:

Receita: R$ ${Number(month.receita_total).toLocaleString("pt-BR")}
Despesa: R$ ${Number(month.despesa_total).toLocaleString("pt-BR")}
Lucro: R$ ${Number(month.lucro_liquido).toLocaleString("pt-BR")}
Margem: ${(Number(month.margem_liquida) * 100).toFixed(1)}%
CMV: ${(cmv * 100).toFixed(1)}%
Custo pessoal: ${(custoPessoal * 100).toFixed(1)}%

Composição de gastos:
${categories.map((c: Record<string, unknown>) => `- ${c.subcategoria}: R$ ${Number(c.total).toLocaleString("pt-BR")} (${(Number(c.percentual_receita) * 100).toFixed(1)}%)`).join("\n")}

Top 5 despesas:
${topDespesas.join("\n")}

Top 5 fornecedores:
${topFornecedores.join("\n")}

Gere:
1. Resumo executivo (3-4 linhas)
2. Top 3 pontos positivos
3. Top 3 pontos de atenção
4. 3 ações recomendadas para o próximo mês
5. Score de saúde de 0-100 com justificativa`;

    const response = await analyzeWithGemini(prompt);

    await sql`
      INSERT INTO ai_analyses (month_id, analysis_type, prompt_summary, response)
      VALUES (${monthId}, 'monthly_report', ${"Auto-relatório " + month.month_year}, ${response})
    `;

    return NextResponse.json({ response });
  } catch (error) {
    console.error("Auto-report error:", error);
    return NextResponse.json({ error: "Erro ao gerar relatório" }, { status: 500 });
  }
}

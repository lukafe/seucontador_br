import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { getModel } from "@/lib/gemini";

export async function POST(request: NextRequest) {
  try {
    const { message, history } = await request.json();
    const sql = getDb();

    // Get all months for context
    const months = await sql`SELECT * FROM months ORDER BY month_year`;

    // Get recent entries for richer context
    const recentMonth = months.length > 0 ? months[months.length - 1] : null;
    let recentEntries: Record<string, unknown>[] = [];
    let recentCategories: Record<string, unknown>[] = [];

    if (recentMonth) {
      recentEntries = await sql`SELECT * FROM entries WHERE month_id = ${recentMonth.id} ORDER BY valor DESC LIMIT 30`;
      recentCategories = await sql`SELECT * FROM category_summary WHERE month_id = ${recentMonth.id} ORDER BY total DESC`;
    }

    const context = `
Dados financeiros da Formedica - Todos os meses carregados:
${months.map((m: Record<string, unknown>) => `${m.month_year}: Receita R$ ${Number(m.receita_total).toLocaleString("pt-BR")} | Despesa R$ ${Number(m.despesa_total).toLocaleString("pt-BR")} | Lucro R$ ${Number(m.lucro_liquido).toLocaleString("pt-BR")} | Margem ${(Number(m.margem_liquida) * 100).toFixed(1)}%`).join("\n")}

${recentMonth ? `
Último mês (${recentMonth.month_year}) - Detalhes:
Composição de gastos:
${recentCategories.map((c: Record<string, unknown>) => `- ${c.subcategoria}: R$ ${Number(c.total).toLocaleString("pt-BR")} (${(Number(c.percentual_receita) * 100).toFixed(1)}%)`).join("\n")}

Principais lançamentos:
${recentEntries.map((e: Record<string, unknown>) => `- ${e.tipo} | ${e.subcategoria} | ${e.descricao}: R$ ${Number(e.valor).toLocaleString("pt-BR")}`).join("\n")}
` : "Nenhum mês carregado ainda."}
`;

    const model = getModel();

    const chatHistory = (history || []).map((msg: { role: string; content: string }) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    }));

    const chat = model.startChat({
      history: [
        { role: "user", parts: [{ text: `Contexto dos dados financeiros:\n${context}` }] },
        { role: "model", parts: [{ text: "Entendido. Tenho acesso aos dados financeiros da Formedica. Como posso ajudar?" }] },
        ...chatHistory,
      ],
    });

    const result = await chat.sendMessageStream(message);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            const text = chunk.text();
            controller.enqueue(encoder.encode(text));
          }
          controller.close();

          // Save to DB after stream completes
          const fullResponse = (await result.response).text();
          await sql`
            INSERT INTO ai_analyses (analysis_type, prompt_summary, response)
            VALUES ('chat', ${message.substring(0, 200)}, ${fullResponse})
          `;
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    console.error("AI chat error:", error);
    return new Response(JSON.stringify({ error: "Erro no chat IA" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

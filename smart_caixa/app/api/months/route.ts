import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const sql = getDb();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (id) {
      const months = await sql`SELECT * FROM months WHERE id = ${parseInt(id)}`;
      if (months.length === 0) {
        return NextResponse.json({ error: "Mês não encontrado" }, { status: 404 });
      }
      return NextResponse.json(months[0]);
    }

    const months = await sql`SELECT * FROM months ORDER BY month_year DESC`;
    return NextResponse.json(months);
  } catch (error) {
    console.error("Months fetch error:", error);
    return NextResponse.json({ error: "Erro ao buscar meses" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const sql = getDb();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID é obrigatório" }, { status: 400 });
    }

    await sql`DELETE FROM category_summary WHERE month_id = ${parseInt(id)}`;
    await sql`DELETE FROM entries WHERE month_id = ${parseInt(id)}`;
    await sql`DELETE FROM ai_analyses WHERE month_id = ${parseInt(id)}`;
    await sql`DELETE FROM months WHERE id = ${parseInt(id)}`;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Month delete error:", error);
    return NextResponse.json({ error: "Erro ao deletar mês" }, { status: 500 });
  }
}

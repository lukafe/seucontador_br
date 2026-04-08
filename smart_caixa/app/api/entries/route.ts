import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const sql = getDb();
    if (!sql) return NextResponse.json([]);
    const { searchParams } = new URL(request.url);
    const monthId = searchParams.get("monthId");
    const categoria = searchParams.get("categoria");
    const subcategoria = searchParams.get("subcategoria");
    const search = searchParams.get("search");

    if (!monthId) {
      return NextResponse.json({ error: "monthId é obrigatório" }, { status: 400 });
    }

    let entries;

    if (categoria && search) {
      entries = await sql`
        SELECT * FROM entries
        WHERE month_id = ${parseInt(monthId)}
        AND categoria = ${categoria}
        AND descricao ILIKE ${"%" + search + "%"}
        ORDER BY data, id
      `;
    } else if (categoria) {
      entries = await sql`
        SELECT * FROM entries
        WHERE month_id = ${parseInt(monthId)}
        AND categoria = ${categoria}
        ORDER BY data, id
      `;
    } else if (subcategoria) {
      entries = await sql`
        SELECT * FROM entries
        WHERE month_id = ${parseInt(monthId)}
        AND subcategoria = ${subcategoria}
        ORDER BY data, id
      `;
    } else if (search) {
      entries = await sql`
        SELECT * FROM entries
        WHERE month_id = ${parseInt(monthId)}
        AND descricao ILIKE ${"%" + search + "%"}
        ORDER BY data, id
      `;
    } else {
      entries = await sql`
        SELECT * FROM entries
        WHERE month_id = ${parseInt(monthId)}
        ORDER BY data, id
      `;
    }

    return NextResponse.json(entries);
  } catch (error) {
    console.error("Entries fetch error:", error);
    return NextResponse.json([]);
  }
}

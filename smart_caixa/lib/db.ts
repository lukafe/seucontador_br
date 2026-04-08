import { neon } from "@neondatabase/serverless";

export function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL não configurada. Adicione nas variáveis de ambiente da Vercel.");
  }
  const sql = neon(process.env.DATABASE_URL);
  return sql;
}

export type SqlQuery = ReturnType<typeof neon>;

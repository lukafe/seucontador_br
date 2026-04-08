import { neon } from "@neondatabase/serverless";

const FALLBACK_DB_URL = "postgresql://neondb_owner:npg_bJMPAgIl61uR@ep-blue-sound-ans07b11-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require";

export function getDb() {
  const url = process.env.DATABASE_URL || FALLBACK_DB_URL;
  return neon(url);
}

export type SqlQuery = ReturnType<typeof neon>;

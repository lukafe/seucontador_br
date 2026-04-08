import { cookies } from "next/headers";

const DEFAULT_EMAILS = "lucasfeka@gmail.com,kaceccon@hotmail.com";

const allowedEmails = (process.env.ALLOWED_EMAILS || DEFAULT_EMAILS)
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

const AUTH_COOKIE = "smart-caixa-session";
const AUTH_SECRET = process.env.NEXTAUTH_SECRET || "smart-caixa-default-secret-2026";

export function isEmailAllowed(email: string): boolean {
  return allowedEmails.includes(email.trim().toLowerCase());
}

export function encodeSession(email: string): string {
  // Simple base64 encoding with secret prefix for basic validation
  const payload = JSON.stringify({ email, ts: Date.now(), key: AUTH_SECRET.slice(0, 8) });
  return Buffer.from(payload).toString("base64");
}

export function decodeSession(token: string): string | null {
  try {
    const payload = JSON.parse(Buffer.from(token, "base64").toString());
    if (payload.key !== AUTH_SECRET.slice(0, 8)) return null;
    return payload.email || null;
  } catch {
    return null;
  }
}

export async function getSessionEmail(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;
  if (!token) return null;
  return decodeSession(token);
}

export { AUTH_COOKIE };

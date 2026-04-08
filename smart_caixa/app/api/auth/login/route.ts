import { NextRequest, NextResponse } from "next/server";
import { isEmailAllowed, encodeSession, AUTH_COOKIE } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || !isEmailAllowed(email)) {
      return NextResponse.json({ error: "Email não autorizado" }, { status: 401 });
    }

    const token = encodeSession(email);
    const response = NextResponse.json({ success: true, email });

    response.cookies.set(AUTH_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch {
    return NextResponse.json({ error: "Erro no login" }, { status: 500 });
  }
}

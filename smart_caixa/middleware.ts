import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("smart-caixa-session")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Basic validation - decode base64 and check structure
  try {
    const payload = JSON.parse(atob(token));
    if (!payload.email) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  } catch {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/upload/:path*",
    "/month/:path*",
    "/compare/:path*",
    "/health/:path*",
    "/assistant/:path*",
    "/dre/:path*",
    "/suppliers/:path*",
    "/payroll/:path*",
    "/goals/:path*",
  ],
};

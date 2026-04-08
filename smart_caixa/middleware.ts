import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/upload/:path*",
    "/month/:path*",
    "/compare/:path*",
    "/health/:path*",
    "/assistant/:path*",
    "/api/upload/:path*",
    "/api/months/:path*",
    "/api/entries/:path*",
    "/api/ai/:path*",
  ],
};

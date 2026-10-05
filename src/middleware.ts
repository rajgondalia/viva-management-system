import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

export async function middleware(req: NextRequest) {
  const s = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  const path = req.nextUrl.pathname;
  if (s) {
    // admin-only area
    if ((path.startsWith("/users") || path.startsWith("/api/admin")) && s.role !== "admin") {
      return path.startsWith("/api/") ? NextResponse.json({ error: "Only admin can do this." }, { status: 403 })
        : NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }
  if (path.startsWith("/api/")) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  url.searchParams.set("next", path);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!login|api/auth/login|_next/static|_next/image|favicon.ico|icon.png|logo.png|logo-white.png).*)"],
};

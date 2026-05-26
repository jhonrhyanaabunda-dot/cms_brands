import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export default auth((req) => {
  const { nextUrl } = req;
  const isAuthed = !!req.auth;
  const isAuthPage = nextUrl.pathname.startsWith("/login") || nextUrl.pathname.startsWith("/register");
  const isPublic =
    nextUrl.pathname === "/" ||
    nextUrl.pathname.startsWith("/api/auth") ||
    nextUrl.pathname.startsWith("/api/cron") ||
    nextUrl.pathname.startsWith("/_next") ||
    nextUrl.pathname.startsWith("/sitemap") ||
    nextUrl.pathname.startsWith("/robots") ||
    nextUrl.pathname.startsWith("/site/"); // public dealership microsites

  if (!isAuthed && !isPublic && !isAuthPage) {
    const url = new URL("/login", nextUrl);
    url.searchParams.set("callbackUrl", nextUrl.pathname + nextUrl.search);
    return NextResponse.redirect(url);
  }
  if (isAuthed && isAuthPage) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|gif|ico)$).*)"],
};

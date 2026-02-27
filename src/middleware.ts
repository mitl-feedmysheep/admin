import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { hasPermissionOver } from "@/lib/roles";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback-secret-change-in-production"
);

const protectedRoutes = ["/dashboard", "/members", "/groups", "/manage", "/system"];

const authRoutes = ["/login"];

const superAdminRoutes = ["/manage/visit", "/manage/prayer"];

const systemAdminRoutes = ["/system/church"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("admin_token")?.value;

  if (pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  let isAuthenticated = false;
  let role: string | undefined;
  let memberId: string | undefined;

  if (token) {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      isAuthenticated = true;
      role = payload.role as string | undefined;
      memberId = payload.memberId as string | undefined;
    } catch {
      isAuthenticated = false;
    }
  }

  const isProtectedRoute = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  if (isProtectedRoute && !isAuthenticated) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const isSuperAdminRoute = superAdminRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  if (isSuperAdminRoute && (!role || !hasPermissionOver(role, "SUPER_ADMIN"))) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  const isSystemAdminRoute = systemAdminRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  if (isSystemAdminRoute && memberId !== process.env.SYSTEM_ADMIN_MEMBER_ID) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  if (isAuthRoute && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icon.svg).*)"],
};

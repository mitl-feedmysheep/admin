import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback-secret-change-in-production"
);

const protectedRoutes = ["/dashboard", "/members", "/groups", "/manage", "/system"];

const authRoutes = ["/login"];

// 심방/기도제목: dept ADMIN+ OR church SUPER_ADMIN
const visitPrayerRoutes = ["/manage/visit", "/manage/prayer"];

// 부서 설정: church SUPER_ADMIN only
const superAdminRoutes = ["/manage/departments"];

const systemAdminRoutes = ["/system/church", "/system/monitoring"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("admin_token")?.value;

  if (pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  let isAuthenticated = false;
  let role: string | undefined;
  let memberId: string | undefined;
  let departmentRole: string | undefined;

  if (token) {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      isAuthenticated = true;
      role = payload.role as string | undefined;
      memberId = payload.memberId as string | undefined;
      departmentRole = payload.departmentRole as string | undefined;
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

  // 심방/기도제목: church SUPER_ADMIN OR dept ADMIN+
  const isVisitPrayerRoute = visitPrayerRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  if (isVisitPrayerRoute) {
    const isSuperAdmin = role === "SUPER_ADMIN";
    const isDeptAdmin = departmentRole === "ADMIN";
    if (!isSuperAdmin && !isDeptAdmin) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  // 부서 설정: church SUPER_ADMIN only
  const isSuperAdminRoute = superAdminRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  if (isSuperAdminRoute && role !== "SUPER_ADMIN") {
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

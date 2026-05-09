import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/jwt";
import { AUTH_COOKIE } from "@/lib/cookies";

function isRoute(pathname: string, route: string) {
  return pathname === route || pathname.startsWith(`${route}/`);
}

function isProtectedRoute(pathname: string) {
  return isRoute(pathname, "/admin") || isRoute(pathname, "/party-dashboard") || isRoute(pathname, "/iec-dashboard");
}

function redirectToLogin(request: NextRequest) {
  return NextResponse.redirect(new URL("/login", request.url));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!isProtectedRoute(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(AUTH_COOKIE)?.value;
  if (!token) return redirectToLogin(request);

  try {
    const payload = await verifyAuthToken(token);
    const role = payload?.role;

    if (isRoute(pathname, "/admin") && !["admin", "super_admin"].includes(role || "")) {
      return redirectToLogin(request);
    }

    if (isRoute(pathname, "/party-dashboard") && role !== "party") {
      return redirectToLogin(request);
    }

    if (isRoute(pathname, "/iec-dashboard") && role !== "iec") {
      return redirectToLogin(request);
    }

    return NextResponse.next();
  } catch {
    return redirectToLogin(request);
  }
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|public).*)"]
};

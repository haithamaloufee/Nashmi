import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE } from "@/lib/cookies";
import { verifyAuthToken } from "@/lib/jwt";

function withSecurityHeaders(response: NextResponse) {
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-src https://www.youtube-nocookie.com https://www.youtube.com",
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join("; ");

  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  return response;
}

function isRoute(pathname: string, route: string) {
  return pathname === route || pathname.startsWith(`${route}/`);
}

function isProtectedRoute(pathname: string) {
  return isRoute(pathname, "/admin") || isRoute(pathname, "/party-dashboard") || isRoute(pathname, "/iec-dashboard");
}

function isPublicRoute(pathname: string) {
  return (
    pathname === "/" ||
    isRoute(pathname, "/laws") ||
    isRoute(pathname, "/parties") ||
    isRoute(pathname, "/posts") ||
    isRoute(pathname, "/polls") ||
    isRoute(pathname, "/updates") ||
    isRoute(pathname, "/iec") ||
    isRoute(pathname, "/chat") ||
    pathname === "/login" ||
    pathname === "/signup"
  );
}

function redirectToLogin(request: NextRequest) {
  return withSecurityHeaders(NextResponse.redirect(new URL("/login", request.url)));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = withSecurityHeaders(NextResponse.next());

  if (isProtectedRoute(pathname)) {
    response.headers.set("Cache-Control", "no-store");
  }

  if (isPublicRoute(pathname)) {
    return response;
  }

  if (!isProtectedRoute(pathname)) {
    return response;
  }

  const token = request.cookies.get(AUTH_COOKIE)?.value;
  if (!token) {
    return redirectToLogin(request);
  }

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
  } catch {
    return redirectToLogin(request);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};

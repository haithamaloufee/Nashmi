import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/jwt";
import { cookies } from "next/headers";
import { AUTH_COOKIE } from "@/lib/cookies";

function isRoute(pathname: string, route: string) {
  return pathname === route || pathname.startsWith(`${route}/`);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes
  if (pathname === "/" || isRoute(pathname, "/laws") || isRoute(pathname, "/parties") || isRoute(pathname, "/posts") || isRoute(pathname, "/polls") || isRoute(pathname, "/updates") || isRoute(pathname, "/iec") || pathname === "/login" || pathname === "/signup") {
    return NextResponse.next();
  }

  // Protected routes - check JWT only
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const payload = await verifyAuthToken(token);
    if (!payload?.userId) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const role = payload.role as string;

    // Admin routes
    if (isRoute(pathname, "/admin")) {
      if (!role || !["admin", "super_admin"].includes(role)) {
        return NextResponse.redirect(new URL("/login", request.url));
      }
    }

    // Party dashboard
    if (isRoute(pathname, "/party-dashboard")) {
      if (role !== "party") {
        return NextResponse.redirect(new URL("/login", request.url));
      }
    }

    // IEC dashboard
    if (isRoute(pathname, "/iec-dashboard")) {
      if (role !== "iec") {
        return NextResponse.redirect(new URL("/login", request.url));
      }
    }

    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|public).*)"],
};

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyJWT } from "@/lib/auth/jwt";

const PUBLIC_PATHS = ["/login", "/mobile-login", "/api/auth/login", "/api/auth/mobile-login", "/api/r2-image"];

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/live-operations",
  "/driver",
  "/app",
  "/orders",
  "/vehicles",
  "/trailers",
  "/drivers",
  "/fuel",
  "/messages",
  "/notifications",
  "/users",
];

function applyApiCors(request: NextRequest, response: NextResponse): NextResponse {
  const origin = request.headers.get("origin") ?? "";
  const allowedOrigins = new Set([
    "http://localhost:8081",
    "http://127.0.0.1:8081",
    "http://localhost:8082",
    "http://127.0.0.1:8082",
    "http://localhost:8083",
    "http://127.0.0.1:8083",
    "http://localhost:19006",
    "http://127.0.0.1:19006",
  ]);

  const isLocalhostOrigin = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);

  if (origin && (allowedOrigins.has(origin) || isLocalhostOrigin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
  }
  response.headers.set("Vary", "Origin");
  response.headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, x-client-source");
  response.headers.set("Access-Control-Allow-Credentials", "true");

  return response;
}

function isProtected(pathname: string): boolean {
  if (pathname.startsWith("/api/")) {
    // Auth routes and public API routes are unprotected
    if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) return false;
    return true;
  }
  return PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isDriverAppPath(pathname: string): boolean {
  return pathname === "/driver" || pathname.startsWith("/driver/") || pathname.startsWith("/app");
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/") && request.method === "OPTIONS") {
    return applyApiCors(request, new NextResponse(null, { status: 204 }));
  }

  // Skip static files
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const cookieToken = request.cookies.get("auth-token")?.value;
  const authHeader = request.headers.get("authorization") ?? "";
  const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
  const token = cookieToken ?? bearerToken;

  // Redirect root by role
  if (pathname === "/") {
    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    try {
      const payload = await verifyJWT(token);
      const target = payload.role === "DRIVER" ? "/app" : "/dashboard";
      return NextResponse.redirect(new URL(target, request.url));
    } catch {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  if (!isProtected(pathname)) {
    const response = NextResponse.next();
    return pathname.startsWith("/api/") ? applyApiCors(request, response) : response;
  }

  if (!token) {
    if (pathname.startsWith("/api/")) {
      return applyApiCors(request, NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const payload = await verifyJWT(token);

    if (payload.role === "DRIVER" && (pathname.startsWith("/dashboard") || pathname.startsWith("/live-operations") || pathname.startsWith("/users"))) {
      return NextResponse.redirect(new URL("/app", request.url));
    }

    if ((payload.role === "ADMIN" || payload.role === "DISPATCHER") && isDriverAppPath(pathname)) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    if (payload.role === "DRIVER" && pathname === "/driver") {
      return NextResponse.redirect(new URL("/app", request.url));
    }

    const response = NextResponse.next();
    return pathname.startsWith("/api/") ? applyApiCors(request, response) : response;
  } catch {
    if (pathname.startsWith("/api/")) {
      return applyApiCors(request, NextResponse.json({ error: "Invalid or expired token" }, { status: 401 }));
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete("auth-token");
    return response;
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

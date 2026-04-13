import { cookies } from "next/headers";
import { headers } from "next/headers";
import { verifyJWT, type JwtPayload } from "./jwt";

export const AUTH_COOKIE = "auth-token";

export async function getCurrentUser(): Promise<JwtPayload | null> {
  try {
    const cookieStore = cookies();
    const headerStore = headers();
    const authHeader = headerStore.get("authorization") ?? "";
    const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
    const token = cookieStore.get(AUTH_COOKIE)?.value ?? bearerToken;
    if (!token) return null;
    return await verifyJWT(token);
  } catch {
    return null;
  }
}

export async function requireAuth(): Promise<JwtPayload> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

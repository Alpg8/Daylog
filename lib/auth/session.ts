import { cookies } from "next/headers";
import { verifyJWT, type JwtPayload } from "./jwt";

export const AUTH_COOKIE = "auth-token";

export async function getCurrentUser(): Promise<JwtPayload | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(AUTH_COOKIE)?.value;
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

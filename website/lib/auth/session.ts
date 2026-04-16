import { cookies } from "next/headers";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
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

    const payload = await verifyJWT(token);
    const userById = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, name: true, isActive: true },
    });

    if (userById?.isActive) {
      return {
        ...payload,
        sub: userById.id,
        email: userById.email,
        role: userById.role,
        name: userById.name,
      };
    }

    const userByEmail = await prisma.user.findUnique({
      where: { email: payload.email },
      select: { id: true, email: true, role: true, name: true, isActive: true },
    });

    if (!userByEmail?.isActive) {
      return null;
    }

    return {
      ...payload,
      sub: userByEmail.id,
      email: userByEmail.email,
      role: userByEmail.role,
      name: userByEmail.name,
    };
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

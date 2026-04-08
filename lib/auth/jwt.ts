import { SignJWT, jwtVerify, type JWTPayload } from "jose";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "fallback-secret-change-in-production"
);

export interface JwtPayload extends JWTPayload {
  sub: string; // userId
  email: string;
  role: string;
  name: string;
}

export async function signJWT(payload: Omit<JwtPayload, "iat" | "exp">): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifyJWT(token: string): Promise<JwtPayload> {
  const { payload } = await jwtVerify(token, secret);
  return payload as JwtPayload;
}

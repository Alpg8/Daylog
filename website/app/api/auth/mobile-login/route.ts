import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { comparePassword } from "@/lib/auth/passwords";
import { signJWT } from "@/lib/auth/jwt";
import { loginSchema } from "@/lib/validators/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Gecersiz giris bilgileri", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.isActive) {
      return NextResponse.json({ error: "E-posta veya sifre hatali" }, { status: 401 });
    }

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "E-posta veya sifre hatali" }, { status: 401 });
    }

    const token = await signJWT({
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    return NextResponse.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      message: "Giris basarili",
    });
  } catch (error) {
    console.error("[AUTH MOBILE LOGIN]", error);
    return NextResponse.json({ error: "Sunucu hatasi" }, { status: 500 });
  }
}

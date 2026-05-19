import { createSessionToken } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    if (!email || !password) {
      return NextResponse.json(
        {
          message: "Email dan password wajib diisi.",
        },
        {
          status: 422,
        },
      );
    }

    const user = await prisma.user.findFirst({
      where: {
        email,
        isActive: true,
        deletedAt: null,
      },
      include: {
        role: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return NextResponse.json(
        {
          message: "Email atau password tidak valid.",
        },
        {
          status: 401,
        },
      );
    }

    const token = createSessionToken({
      sub: user.id,
      email: user.email,
      role: user.role?.slug ?? null,
    });

    const response = NextResponse.json({
      message: "Login berhasil.",
      token_type: "Bearer",
      access_token: token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });

    response.cookies.set("pos_session", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 12,
    });

    return response;
  } catch (error) {
    console.error(error);

    const message =
      error instanceof Error ? error.message : "Server error.";

    // Provide clearer response when database is not configured.
    if (message.includes("Missing DATABASE_URL")) {
      return NextResponse.json(
        {
          message:
            "Server misconfigured: DATABASE_URL is not set in deployment environment.",
        },
        {
          status: 500,
        },
      );
    }

    return NextResponse.json(
      {
        message: "Server error.",
      },
      {
        status: 500,
      },
    );
  }
}

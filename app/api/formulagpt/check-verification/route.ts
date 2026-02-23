// app/api/formulagpt/check-verification/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Only check FormulaGPT users
    const user = await prisma.user.findFirst({
      where: {
        email,
        source: "formulagpt",
      },
      select: { emailVerified: true },
    });

    if (!user) {
      // User doesn't exist in FormulaGPT
      return NextResponse.json({ verified: false });
    }

    return NextResponse.json({
      verified: user.emailVerified !== null,
    });

  } catch (err) {
    console.error("[formulagpt-check-verification] Error:", err);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
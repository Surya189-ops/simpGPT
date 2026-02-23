// app/api/formulagpt/check-premium/route.ts
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

    // Find FormulaGPT user
    const user = await prisma.user.findFirst({
      where: {
        email,
        source: "formulagpt",
      },
      select: {
        subscriptionStatus: true,
        subscriptionEndDate: true,
      },
    });

    if (!user) {
      return NextResponse.json({ isPremium: false });
    }

    // Check if subscription is active and not expired
    const isPremium =
      user.subscriptionStatus === "active" &&
      user.subscriptionEndDate &&
      new Date(user.subscriptionEndDate) > new Date();

    return NextResponse.json({ isPremium });

  } catch (err) {
    console.error("[check-premium] Error:", err);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
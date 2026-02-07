import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { email, otp, type } = await req.json();
    // type: "signup" | "reset"

    if (!email || !otp) {
      return NextResponse.json(
        { error: "Email and OTP are required" },
        { status: 400 }
      );
    }

    const record = await prisma.emailOTP.findFirst({
      where: { email },
      orderBy: { createdAt: "desc" },
    });

    if (!record) {
      return NextResponse.json(
        { error: "OTP not found. Please request again." },
        { status: 400 }
      );
    }

    if (record.expiresAt < new Date()) {
      await prisma.emailOTP.delete({ where: { id: record.id } });
      return NextResponse.json(
        { error: "OTP expired. Please request again." },
        { status: 400 }
      );
    }

    if (record.code !== otp) {
      return NextResponse.json(
        { error: "Invalid OTP" },
        { status: 400 }
      );
    }

    // ✅ SIGNUP FLOW
    if (type !== "reset") {
      await prisma.user.update({
        where: { email },
        data: { emailVerified: new Date() },
      });
    }

    // 🧹 cleanup OTP
    await prisma.emailOTP.deleteMany({ where: { email } });

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("Verify OTP error:", err);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}

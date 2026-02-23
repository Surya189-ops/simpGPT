// app/api/formulagpt/verify-otp/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@supabase/supabase-js";

const supabaseAnon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: Request) {
  try {
    const { email, otp, password } = await req.json();

    if (!email || !otp) {
      return NextResponse.json(
        { error: "Email and OTP are required" },
        { status: 400 }
      );
    }

    // ── 1. Validate OTP ──────────────────────────────────────────────────────
    const record = await prisma.emailOTP.findFirst({
      where: { email },
      orderBy: { createdAt: "desc" },
    });

    if (!record) {
      return NextResponse.json(
        { error: "OTP not found. Please request a new one." },
        { status: 400 }
      );
    }

    if (record.expiresAt < new Date()) {
      await prisma.emailOTP.delete({ where: { id: record.id } });
      return NextResponse.json(
        { error: "OTP expired. Please request a new one." },
        { status: 400 }
      );
    }

    if (record.code !== otp) {
      return NextResponse.json(
        { error: "Invalid OTP. Please try again." },
        { status: 400 }
      );
    }

    // ── 2. Get FormulaGPT user only ──────────────────────────────────────────
    const user = await prisma.user.findFirst({
      where: {
        email,
        source: "formulagpt", // Only FormulaGPT users
      },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found. Please sign up again." },
        { status: 404 }
      );
    }

    // ── 3. Mark verified in Prisma ───────────────────────────────────────────
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: new Date() },
    });

    console.log("[formulagpt-verify] Email verified for:", email);

    // ── 4. Clean up OTP ──────────────────────────────────────────────────────
    await prisma.emailOTP.deleteMany({ where: { email } });

    // ── 5. Sign in and return session ────────────────────────────────────────
    if (password) {
      const { data: signInData, error: signInError } =
        await supabaseAnon.auth.signInWithPassword({ email, password });

      if (signInError) {
        console.error("[formulagpt-verify] Sign-in error:", signInError.message);
        return NextResponse.json({ success: true, session: null });
      }

      console.log("[formulagpt-verify] Sign-in successful");
      return NextResponse.json({
        success: true,
        session: {
          access_token: signInData.session!.access_token,
          refresh_token: signInData.session!.refresh_token,
        },
      });
    }

    return NextResponse.json({ success: true, session: null });

  } catch (err) {
    console.error("[formulagpt-verify] Unexpected error:", err);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
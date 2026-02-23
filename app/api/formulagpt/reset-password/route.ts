// app/api/formulagpt/reset-password/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { autoRefreshToken: false, persistSession: false },
  }
);

export async function POST(req: Request) {
  try {
    const { email, otp, newPassword } = await req.json();

    if (!email || !otp || !newPassword) {
      return NextResponse.json(
        { error: "Email, OTP, and new password are required" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
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

    // ── 2. Get FormulaGPT user from Prisma ───────────────────────────────────
    const prismaUser = await prisma.user.findFirst({
      where: {
        email,
        source: "formulagpt",
      },
      select: { id: true },
    });

    if (!prismaUser) {
      return NextResponse.json(
        { error: "No FormulaGPT account found with this email." },
        { status: 404 }
      );
    }

    // ── 3. Verify user exists in FormulaGPT Supabase ─────────────────────────
    const { data: listData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    const supabaseUser = listData?.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (!supabaseUser) {
      console.error("[formulagpt-reset] User not in Supabase:", email);
      return NextResponse.json(
        { error: "Account not found in auth system." },
        { status: 404 }
      );
    }

    // ── 4. Update password in FormulaGPT Supabase ────────────────────────────
    const { error: updateError } =
      await supabaseAdmin.auth.admin.updateUserById(supabaseUser.id, {
        password: newPassword,
      });

    if (updateError) {
      console.error("[formulagpt-reset] Password update error:", updateError);
      return NextResponse.json(
        { error: "Failed to update password." },
        { status: 500 }
      );
    }

    // ── 5. Clean up OTP ──────────────────────────────────────────────────────
    await prisma.emailOTP.deleteMany({ where: { email } });

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("[formulagpt-reset] Unexpected error:", err);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
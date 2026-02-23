// scripts/debug-auth.ts
// Run with: npx ts-node scripts/debug-auth.ts suryagoudgames52@gmail.com

import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

const prisma = new PrismaClient();
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function debug() {
  const email = process.argv[2];
  if (!email) {
    console.log("Usage: npx ts-node scripts/debug-auth.ts EMAIL");
    process.exit(1);
  }

  console.log(`\n🔍 Checking auth state for: ${email}\n`);

  // Check Prisma
  const prismaUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, emailVerified: true },
  });

  console.log("📊 PRISMA:");
  if (prismaUser) {
    console.log(`  ✓ User found`);
    console.log(`    ID: ${prismaUser.id}`);
    console.log(`    Email: ${prismaUser.email}`);
    console.log(`    Verified: ${prismaUser.emailVerified ? 'YES' : 'NO'}`);
  } else {
    console.log(`  ✗ User NOT found`);
  }

  // Check OTP
  const otp = await prisma.emailOTP.findFirst({
    where: { email },
    orderBy: { createdAt: "desc" },
  });

  console.log("\n🔑 OTP:");
  if (otp) {
    console.log(`  ✓ OTP exists`);
    console.log(`    Code: ${otp.code}`);
    console.log(`    Expires: ${otp.expiresAt}`);
    console.log(`    Expired: ${otp.expiresAt < new Date() ? 'YES' : 'NO'}`);
  } else {
    console.log(`  ✗ No OTP found`);
  }

  // Check Supabase
  const { data: listData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
  const supabaseUser = listData?.users.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase()
  );

  console.log("\n🔐 SUPABASE:");
  if (supabaseUser) {
    console.log(`  ✓ User found`);
    console.log(`    ID: ${supabaseUser.id}`);
    console.log(`    Email: ${supabaseUser.email}`);
    console.log(`    Confirmed: ${supabaseUser.email_confirmed_at ? 'YES' : 'NO'}`);
    console.log(`    Matches Prisma ID: ${supabaseUser.id === prismaUser?.id ? 'YES' : 'NO'}`);
  } else {
    console.log(`  ✗ User NOT found`);
  }

  console.log("\n📋 ALL SUPABASE USERS:");
  listData?.users.forEach((u, i) => {
    console.log(`  ${i + 1}. ${u.email} (${u.id.slice(0, 8)}...)`);
  });

  console.log("\n");
  await prisma.$disconnect();
}

debug().catch(console.error);
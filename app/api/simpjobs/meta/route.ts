import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ meta: null });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      searchCount: true,
      lastSearchReset: true,
      subscriptionTier: true,
    },
  });

  if (!user) {
    return NextResponse.json({ meta: null });
  }

  const now = new Date();
  const resetAt = new Date(user.lastSearchReset);
  resetAt.setHours(24, 0, 0, 0);

  if (resetAt <= now) {
    resetAt.setDate(resetAt.getDate() + 1);
  }

  const msLeft = resetAt.getTime() - now.getTime();

  return NextResponse.json({
    meta: {
      searchCount: user.searchCount,
      resetInMs: msLeft,
      tier: user.subscriptionTier,
    },
  });
}

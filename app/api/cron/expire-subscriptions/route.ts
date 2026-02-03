// app/api/cron/expire-subscriptions/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  // 🔐 Protect cron endpoint
  const auth = req.headers.get("authorization");

  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const now = new Date();

  const result = await prisma.user.updateMany({
    where: {
      subscriptionTier: { not: "free" },
      subscriptionEndDate: {
        lt: now,
      },
    },
    data: {
      subscriptionTier: "free",
      subscriptionStatus: "expired",
    },
  });

  return NextResponse.json({
    success: true,
    expiredUsers: result.count,
  });
}

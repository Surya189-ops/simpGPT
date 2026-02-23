import { NextResponse } from "next/server";
import crypto from "crypto";
import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

const prisma = new PrismaClient();

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const signature = req.headers.get("x-razorpay-signature");

    if (!signature) {
      return NextResponse.json({ error: "No signature" }, { status: 400 });
    }

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET!)
      .update(body)
      .digest("hex");

    if (signature !== expectedSignature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const event = JSON.parse(body);

    if (
      event.event === "payment.captured" ||
      event.event === "order.paid"
    ) {
      const payment = event.payload.payment?.entity;
      const order = event.payload.order?.entity;

      const notes = payment?.notes || order?.notes;
      const userId = notes?.userId;
      const product = notes?.product;

      if (!userId || !product) {
        return NextResponse.json(
          { error: "Missing userId or product" },
          { status: 400 }
        );
      }

      // ==============================
      // 🔵 SIMPJOBS PRODUCT
      // ==============================
      if (product === "simpjobs") {
        await prisma.user.update({
          where: { id: userId },
          data: {
            subscriptionTier: "pro",
            subscriptionStatus: "active",
            subscriptionEndDate: new Date(
              Date.now() + 30 * 24 * 60 * 60 * 1000
            ),
          },
        });

        console.log("✅ SimpJobs upgraded:", userId);
      }

      // ==============================
      // 🟣 FORMULAGPT PRODUCT
      // ==============================
      if (product === "formulagpt") {
        const premiumUntil = new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000
        );

        await supabaseAdmin
          .from("profiles")
          .update({
            is_premium: true,
            premium_until: premiumUntil.toISOString(),
          })
          .eq("id", userId);

        console.log("✅ FormulaGPT upgraded:", userId);
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json({ error: "Webhook error" }, { status: 500 });
  }
}

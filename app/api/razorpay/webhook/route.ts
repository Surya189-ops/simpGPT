import { NextResponse } from "next/server";
import crypto from "crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    // 1️⃣ Read raw body (important for signature verification)
    const body = await req.text();

    // 2️⃣ Get Razorpay signature
    const signature = req.headers.get("x-razorpay-signature");
    if (!signature) {
      return NextResponse.json({ error: "No signature" }, { status: 400 });
    }

    // 3️⃣ Verify signature
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET!)
      .update(body)
      .digest("hex");

    if (signature !== expectedSignature) {
      console.error("❌ Invalid webhook signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    // 4️⃣ Parse event AFTER verification
    const event = JSON.parse(body);

    // 5️⃣ Handle valid payment events
    if (
      event.event === "payment.captured" ||
      event.event === "order.paid"
    ) {
      const payment = event.payload.payment?.entity;
      const order = event.payload.order?.entity;

      // 🔥 Get userId from Razorpay notes
      const userId =
        payment?.notes?.userId ||
        order?.notes?.userId;

      if (!userId) {
        console.error("❌ userId missing in Razorpay notes");
        return NextResponse.json(
          { error: "Missing userId" },
          { status: 400 }
        );
      }

      // ✅ Upgrade subscription + set expiry (30 days)
      await prisma.user.update({
        where: { id: userId },
        data: {
          subscriptionTier: "pro",
          subscriptionStatus: "active",
          subscriptionEndDate: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 days
          ),
        },
      });

      console.log("✅ Subscription upgraded to PRO for userId:", userId);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("❌ Webhook error:", err);
    return NextResponse.json({ error: "Webhook error" }, { status: 500 });
  }
}

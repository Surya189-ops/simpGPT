"use client";

import { useState } from "react";
import { getSupabaseClient } from "@/lib/supabaseClient";

interface UpgradeModalProps {
  onClose: () => void;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function UpgradeModal({ onClose }: UpgradeModalProps) {
  const [loading, setLoading] = useState(false);
  const supabase = getSupabaseClient();

  const handleUpgrade = async () => {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert("Please login first");
        onClose();
        return;
      }

      const orderRes = await fetch("/api/formulagpt/razorpay/create-order", {
        method: "POST",
      });

      if (!orderRes.ok) {
        throw new Error("Failed to create order");
      }

      const { orderId, amount, currency } = await orderRes.json();

      if (!window.Razorpay) {
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.async = true;
        document.body.appendChild(script);

        await new Promise((resolve) => {
          script.onload = resolve;
        });
      }

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: amount,
        currency: currency,
        name: "FormulaGPT",
        description: "FormulaGPT Pro - Monthly",
        order_id: orderId,
        handler: async function (response: any) {
          const verifyRes = await fetch("/api/formulagpt/razorpay/verify", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(response),
          });

          const verifyData = await verifyRes.json();

          if (verifyData.success) {
            alert("🎉 Payment successful! Premium activated for 30 days.");
            window.location.reload();
          } else {
            alert("Payment verification failed.");
          }
        },
        prefill: {
          email: user.email,
        },
        theme: {
          color: "#6366f1",
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
      setLoading(false);
    } catch (err) {
      alert("Payment failed. Try again.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">

        <h2 className="text-2xl font-bold text-center mb-4 text-gray-900 dark:text-white">
          Upgrade to Pro
        </h2>

        <div className="text-center mb-6">
          <div className="text-5xl font-bold text-gray-900 dark:text-white mb-2">₹49</div>
          <div className="text-lg text-gray-600 dark:text-gray-300">/month</div>
        </div>

        <button
          onClick={handleUpgrade}
          disabled={loading}
          className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white py-3 rounded-xl font-bold transition-all disabled:opacity-50"
        >
          {loading ? "Processing..." : "Upgrade Now"}
        </button>

        <button
          onClick={onClose}
          className="w-full mt-3 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
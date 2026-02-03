import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FormulaGPT – JEE & NEET Formula Helper",
  description:
    "Instantly find the right physics, chemistry, and maths formulas for JEE & NEET.",
};

export default function FormulaGPTLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

// app/tools/simpjobs/layout.tsx
import type { Metadata } from "next";
import { headers } from "next/headers";

export const metadata: Metadata = {
  title: "SimpJobs – Find Better Jobs Faster",
  description:
    "AI-powered job search with resume matching and smart filters.",
};

export default async function SimpJobsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const countryCode = headersList.get("x-vercel-ip-country");

  const detectedCountry = countryCode === "IN" ? "IN" : "GLOBAL";

  return (
    <div data-country={detectedCountry}>
      {children}
    </div>
  );
}
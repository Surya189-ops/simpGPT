import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SimpJobs – Find Better Jobs Faster",
  description:
    "AI-powered job search with resume matching and smart filters.",
};

export default function SimpJobsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

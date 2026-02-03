// simpgpt/app/layout.tsx

import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "SimpGPT - Ask anything",
  description: "Learn faster with simple, accurate, and easy explanations.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {/* NextAuth Session Provider (safe for all tools) */}
        <Providers>{children}</Providers>

        {/* Google Analytics */}
        <script
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-EBL9WQEYNF"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-EBL9WQEYNF');
            `,
          }}
        />
      </body>
    </html>
  );
}

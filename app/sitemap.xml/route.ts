import { NextResponse } from "next/server";

export async function GET() {
  const baseUrl = "https://simpgpt.in";

  const pages = [
    "",
    "/tools/text-simplifier",
    "/tools/eli5",
    "/tools/username-generator",
    "/tools/formulagpt"
  ];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
  .map(
    (page) => `
  <url>
    <loc>${baseUrl}${page}</loc>
  </url>
`
  )
  .join("")}
</urlset>`;

  return new NextResponse(sitemap, {
    headers: {
      "Content-Type": "application/xml",
    },
  });
}

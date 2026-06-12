import type { APIRoute } from "astro";
import { markets } from "../config/markets";
import { secondaryPages } from "../config/secondary-pages";

const base = "https://georgiahills.com";

type Entry = {
  loc: string;
  alternates?: Array<{ hreflang: string; href: string }>;
};

function absolute(path: string) {
  return `${base}${path}`;
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export const GET: APIRoute = () => {
  const entries: Entry[] = [
    {
      loc: absolute("/"),
      alternates: [
        { hreflang: "en", href: absolute("/") },
        { hreflang: "ar", href: absolute("/arabic.html") },
        { hreflang: "x-default", href: absolute("/") }
      ]
    },
    {
      loc: absolute("/booking.html"),
      alternates: [
        { hreflang: "en", href: absolute("/booking.html") },
        { hreflang: "ar", href: absolute("/booking-ar.html") },
        { hreflang: "x-default", href: absolute("/booking.html") }
      ]
    }
  ];

  for (const market of markets) {
    const loc = absolute(`/${market.code}.html`);
    entries.push({
      loc,
      alternates: [
        { hreflang: "ar", href: loc },
        { hreflang: "x-default", href: absolute("/") }
      ]
    });
  }

  for (const page of secondaryPages) {
    const loc = absolute(`/${page.slug}.html`);
    const alternates: Array<{ hreflang: string; href: string }> = [
      { hreflang: page.lang, href: loc },
      { hreflang: "x-default", href: absolute("/") }
    ];

    if (page.pairedSlug) {
      alternates.splice(1, 0, {
        hreflang: page.lang === "ar" ? "en" : "ar",
        href: absolute(`/${page.pairedSlug}.html`)
      });
    }

    entries.push({ loc, alternates });
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries
    .map((entry) => `  <url>
    <loc>${escapeXml(entry.loc)}</loc>
${(entry.alternates || [])
    .map((alt) => `    <xhtml:link rel="alternate" hreflang="${escapeXml(alt.hreflang)}" href="${escapeXml(alt.href)}" />`)
    .join("\n")}
  </url>`)
    .join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8"
    }
  });
};

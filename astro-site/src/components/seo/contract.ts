export type HreflangItem = {
  hreflang: string;
  href: string;
};

export type SeoContract = {
  lang: "en" | "ar";
  dir: "ltr" | "rtl";
  title: string;
  description: string;
  canonical: string;
  hreflangs: HreflangItem[];
  ogImage: string;
  robots: string;
  twitterCard: "summary" | "summary_large_image";
  schemaGraph: Record<string, unknown>[];
};

export function ensureSeoContract(input: Partial<SeoContract> & { lang: "en" | "ar"; dir: "ltr" | "rtl"; title: string; description: string; canonical: string; }, pageId = "unknown"): SeoContract {
  const hreflangs = Array.isArray(input.hreflangs) ? input.hreflangs.filter((item) => item && item.hreflang && item.href) : [];
  const schemaGraph = Array.isArray(input.schemaGraph) ? input.schemaGraph.filter(Boolean) : [];

  const missing: string[] = [];
  if (!hreflangs.length) missing.push("hreflangs");
  if (!schemaGraph.length) missing.push("schemaGraph");
  if (!input.ogImage) missing.push("ogImage");
  if (!input.robots) missing.push("robots");
  if (!input.twitterCard) missing.push("twitterCard");

  if (missing.length) {
    throw new Error(`SEO contract violation on ${pageId}: missing ${missing.join(", ")}`);
  }

  return {
    lang: input.lang,
    dir: input.dir,
    title: input.title,
    description: input.description,
    canonical: input.canonical,
    hreflangs,
    ogImage: input.ogImage,
    robots: input.robots,
    twitterCard: input.twitterCard,
    schemaGraph
  };
}

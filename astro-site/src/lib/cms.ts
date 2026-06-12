import cmsExport from "../data/cms-export.json";
import contentfulExport from "../data/contentful-export.json";
import type { CmsPageDocument } from "../config/cms-model";
import type { SecondaryPage } from "../config/secondary-pages";
import type { MarketConfig } from "../config/markets";

type CmsExportShape = {
  generatedAt?: string;
  pages?: CmsPageDocument[];
};

const cmsProvider = (import.meta.env.PUBLIC_CMS_PROVIDER || "firestore").toLowerCase();
const cms = (cmsProvider === "contentful" ? contentfulExport : cmsExport) as CmsExportShape;

function localizedValue(input: { en?: string; ar?: string } | undefined, lang: "en" | "ar") {
  if (!input) return "";
  const value = lang === "ar" ? input.ar : input.en;
  return String(value || "").trim();
}

export function getPublishedCmsPage(slug: string) {
  const pages = Array.isArray(cms.pages) ? cms.pages : [];
  return pages.find((page) => page.slug === slug && page.status === "published");
}

export function mergeSecondaryWithCms(page: SecondaryPage): SecondaryPage {
  const cmsPage = getPublishedCmsPage(page.slug);
  if (!cmsPage) return page;

  const title = localizedValue(cmsPage.title, page.lang);
  const description = localizedValue(cmsPage.description, page.lang);
  const body = localizedValue(cmsPage.body, page.lang);

  return {
    ...page,
    title: title || page.title,
    description: description || page.description,
    body: body || page.body
  };
}

export function mergeMarketWithCms(market: MarketConfig): MarketConfig {
  const candidates = [market.code, `market-${market.code}`];
  const cmsPage = candidates
    .map((slug) => getPublishedCmsPage(slug))
    .find(Boolean);

  if (!cmsPage) return market;

  const titleAr = localizedValue(cmsPage.title, "ar");
  const descriptionAr = localizedValue(cmsPage.description, "ar");
  const bodyAr = localizedValue(cmsPage.body, "ar");

  return {
    ...market,
    pageTitle: titleAr || market.pageTitle,
    heading: titleAr || market.heading,
    description: descriptionAr || market.description,
    ogDescription: descriptionAr || market.ogDescription,
    body: bodyAr || market.body
  };
}

export function cmsLastUpdatedIso() {
  const value = String(cms.generatedAt || "").trim();
  return value || null;
}

export function getCorePageCopy(
  slug: string,
  lang: "en" | "ar",
  fallback: {
    heroTitle: string;
    heroSubtitle: string;
    sectionTitle?: string;
    sectionSubtitle?: string;
  }
) {
  const cmsPage = getPublishedCmsPage(slug);
  if (!cmsPage) return fallback;

  const title = localizedValue(cmsPage.title, lang);
  const description = localizedValue(cmsPage.description, lang);
  const body = localizedValue(cmsPage.body, lang);
  const bodyLines = body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return {
    heroTitle: title || fallback.heroTitle,
    heroSubtitle: description || fallback.heroSubtitle,
    sectionTitle: bodyLines[0] || fallback.sectionTitle,
    sectionSubtitle: bodyLines[1] || fallback.sectionSubtitle
  };
}

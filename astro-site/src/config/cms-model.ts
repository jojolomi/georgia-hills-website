export type CmsLocale = "en" | "ar";

export type CmsLocalizedField = {
  en?: string;
  ar?: string;
};

export type CmsPageDocument = {
  id: string;
  slug: string;
  status: "draft" | "published";
  title: CmsLocalizedField;
  description: CmsLocalizedField;
  body: CmsLocalizedField;
  updatedAt?: string;
};

export type CmsDestinationDocument = {
  id: string;
  slug: string;
  name: CmsLocalizedField;
  summary: CmsLocalizedField;
  heroImage?: string;
  updatedAt?: string;
};

export type CmsArticleDocument = {
  id: string;
  slug: string;
  title: CmsLocalizedField;
  excerpt: CmsLocalizedField;
  content: CmsLocalizedField;
  coverImage?: string;
  publishedAt?: string;
};

export type CmsSnapshot = {
  generatedAt: string;
  pages: CmsPageDocument[];
  destinations: CmsDestinationDocument[];
  articles: CmsArticleDocument[];
};

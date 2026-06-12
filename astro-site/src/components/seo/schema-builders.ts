import type { SecondaryPage } from "../../config/secondary-pages";

const org = {
  "@type": "Organization",
  name: "Georgia Hills",
  url: "https://georgiahills.com",
  telephone: "+995579088537"
};

export function localBusinessSchema(pageUrl: string) {
  return {
    "@type": "LocalBusiness",
    name: "Georgia Hills",
    url: pageUrl,
    telephone: "+995579088537",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Tbilisi",
      addressCountry: "GE"
    }
  };
}

export function breadcrumbSchema(items: Array<{ name: string; item: string }>) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((entry, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: entry.name,
      item: entry.item
    }))
  };
}

export function pageSchemasForSecondary(page: SecondaryPage) {
  const isDestination = /^(tbilisi|batumi|kazbegi|martvili|signagi)(-ar)?$/.test(page.slug);
  const isPackage = /(itineraries|honeymoon|family|halal|safety|destinations-hub)/.test(page.slug);

  const graph: Record<string, unknown>[] = [
    org,
    localBusinessSchema(page.canonical),
    {
      "@type": "WebPage",
      name: page.heading,
      inLanguage: page.lang,
      url: page.canonical,
      description: page.description
    },
    breadcrumbSchema([
      {
        name: page.lang === "ar" ? "الرئيسية" : "Home",
        item: page.lang === "ar" ? "https://georgiahills.com/arabic.html" : "https://georgiahills.com/"
      },
      { name: page.heading, item: page.canonical }
    ])
  ];

  if (isDestination) {
    graph.push({
      "@type": "TouristAttraction",
      name: page.heading,
      description: page.description,
      touristType: page.lang === "ar" ? "العائلات والمسافرون العرب" : "Families and GCC travelers"
    });
  }

  if (isPackage) {
    graph.push({
      "@type": "TouristTrip",
      name: page.heading,
      description: page.description,
      provider: { "@type": "Organization", name: "Georgia Hills" },
      offers: {
        "@type": "Offer",
        priceCurrency: "USD",
        availability: "https://schema.org/InStock"
      }
    });
  }

  return graph;
}

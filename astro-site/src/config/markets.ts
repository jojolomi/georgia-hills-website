export type MarketCode = "sa" | "ae" | "qa" | "kw" | "eg";

export type MarketConfig = {
  code: MarketCode;
  countryAr: string;
  pageTitle: string;
  description: string;
  ogDescription: string;
  heading: string;
  body: string;
};

export const markets: MarketConfig[] = [
  {
    code: "sa",
    countryAr: "السعودية",
    pageTitle: "السفر من السعودية إلى جورجيا | Georgia Hills",
    description: "برامج خاصة للمسافرين من السعودية إلى جورجيا مع سائق خاص وخطط عائلية مريحة.",
    ogDescription: "حزم سياحية وسائق خاص للمسافرين من السعودية.",
    heading: "السفر من السعودية إلى جورجيا",
    body: "نقدم خطط سياحية مخصصة للمسافرين من السعودية تشمل تبليسي وكازبيجي وباتومي مع سائق خاص ودعم عربي كامل وخيارات عائلية فاخرة."
  },
  {
    code: "ae",
    countryAr: "الإمارات",
    pageTitle: "السفر من الإمارات إلى جورجيا | Georgia Hills",
    description: "برامج خاصة للمسافرين من الإمارات إلى جورجيا مع سائق خاص وخطط عائلية مريحة.",
    ogDescription: "حزم سياحية وسائق خاص للمسافرين من الإمارات.",
    heading: "السفر من الإمارات إلى جورجيا",
    body: "نقدم خطط سياحية مخصصة للمسافرين من الإمارات تشمل تبليسي وكازبيجي وباتومي مع سائق خاص ودعم عربي كامل وخيارات عائلية فاخرة."
  },
  {
    code: "qa",
    countryAr: "قطر",
    pageTitle: "السفر من قطر إلى جورجيا | Georgia Hills",
    description: "برامج خاصة للمسافرين من قطر إلى جورجيا مع سائق خاص وخطط عائلية مريحة.",
    ogDescription: "حزم سياحية وسائق خاص للمسافرين من قطر.",
    heading: "السفر من قطر إلى جورجيا",
    body: "نقدم خطط سياحية مخصصة للمسافرين من قطر تشمل تبليسي وكازبيجي وباتومي مع سائق خاص ودعم عربي كامل وخيارات عائلية فاخرة."
  },
  {
    code: "kw",
    countryAr: "الكويت",
    pageTitle: "السفر من الكويت إلى جورجيا | Georgia Hills",
    description: "برامج خاصة للمسافرين من الكويت إلى جورجيا مع سائق خاص وخطط عائلية مريحة.",
    ogDescription: "حزم سياحية وسائق خاص للمسافرين من الكويت.",
    heading: "السفر من الكويت إلى جورجيا",
    body: "نقدم خطط سياحية مخصصة للمسافرين من الكويت تشمل تبليسي وكازبيجي وباتومي مع سائق خاص ودعم عربي كامل وخيارات عائلية فاخرة."
  },
  {
    code: "eg",
    countryAr: "مصر",
    pageTitle: "السفر من مصر إلى جورجيا | Georgia Hills",
    description: "برامج خاصة للمسافرين من مصر إلى جورجيا مع سائق خاص وخطط عائلية مريحة.",
    ogDescription: "حزم سياحية وسائق خاص للمسافرين من مصر.",
    heading: "السفر من مصر إلى جورجيا",
    body: "نقدم خطط سياحية مخصصة للمسافرين من مصر تشمل تبليسي وكازبيجي وباتومي مع سائق خاص ودعم عربي كامل وخيارات عائلية فاخرة."
  }
];

export function getMarketByCode(code: string) {
  return markets.find((item) => item.code === code);
}

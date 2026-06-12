import { defineCollection, z } from "astro:content";

const blog = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    description: z.string(),
    lang: z.enum(["en", "ar"]),
    intent: z.enum(["planning", "cost", "itinerary", "halal", "safety"]),
    market: z.array(z.enum(["sa", "ae", "qa", "kw", "eg"]))
  })
});

export const collections = { blog };

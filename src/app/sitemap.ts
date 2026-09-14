import type { MetadataRoute } from "next";
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://www.globi-vulkan.ch",
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}

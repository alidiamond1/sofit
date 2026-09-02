import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/coach/", "/client/", "/api/"],
    },
    sitemap: "https://sofit.so/sitemap.xml",
  };
}

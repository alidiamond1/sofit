import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://sofit.so";
  const routes = ["", "/programs", "/about", "/results", "/dietcoach", "/contact"];

  return routes.map((route, index) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: index === 0 ? "weekly" : "monthly",
    priority: index === 0 ? 1 : route === "/programs" ? 0.9 : 0.7,
  }));
}

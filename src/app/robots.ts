import { getBaseUrl } from "@/lib/utils/getBaseUrl";
import { type MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getBaseUrl();
  const disallowPrivateRoutes = [
    "/dashboard/",
    "/api/",
    "/trpc/",
    "/auth-error",
    "/subscribe/success",
    "/catalog/",
    "/*/catalog",
    "/*/catalog?*",
  ];

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: disallowPrivateRoutes,
      },
      {
        userAgent: [
          "Googlebot",
          "Bingbot",
          "msnbot",
          "PerplexityBot",
          "GPTBot",
          "ChatGPT-User",
          "ClaudeBot",
          "anthropic-ai",
        ],
        allow: "/",
        disallow: disallowPrivateRoutes,
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}

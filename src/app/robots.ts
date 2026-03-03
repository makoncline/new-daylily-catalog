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
    "/*/search",
    "/*/search?*",
  ];
  const blockedBots = [
    "ClaudeBot",
    "anthropic-ai",
    "GPTBot",
    "ChatGPT-User",
    "PerplexityBot",
    "meta-externalagent",
    "meta-externalfetcher",
    "GoogleOther",
    "Amazonbot",
    "PetalBot",
    "CCBot",
    "Bytespider",
    "vercel-screenshot-bot",
  ];

  return {
    rules: [
      {
        userAgent: blockedBots,
        disallow: "/",
      },
      {
        userAgent: "*",
        allow: "/",
        disallow: disallowPrivateRoutes,
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}

import { fileURLToPath } from "node:url";
import path from "node:path";
import { storefrontRemoteImageHostnames } from "@daylily-catalog/storefront-contract";

const appDir = path.dirname(fileURLToPath(import.meta.url));

/** @type {import("next").NextConfig} */
const config = {
  output: process.env.VERCEL === "1" ? undefined : "standalone",
  outputFileTracingRoot: path.join(appDir, "../.."),
  images: {
    remotePatterns: storefrontRemoteImageHostnames.map((hostname) => ({
      protocol: "https",
      hostname,
    })),
  },
  async headers() {
    return [
      {
        source: "/",
        headers: [
          {
            key: "Link",
            value:
              '</sitemap.xml>; rel="sitemap"; type="application/xml", </robots.txt>; rel="describedby", </llms.txt>; rel="service-doc"; type="text/plain", </.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json", </openapi.json>; rel="service-desc"; type="application/vnd.oai.openapi+json", </.well-known/agent-skills/index.json>; rel="service-desc"; type="application/json"',
          },
        ],
      },
    ];
  },
};

export default config;

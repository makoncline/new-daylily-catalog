import { ImageResponse } from "next/og";

import { getStorefrontSiteConfig } from "@/config/storefront-site-config";

export const storefrontIconSize = { width: 64, height: 64 } as const;

export function createStorefrontIconResponse() {
  const site = getStorefrontSiteConfig();
  const initials = site.brand.shortName
    .split(/\s+/)
    .map((word) => word.at(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: site.brand.themeColor,
          borderRadius: 14,
          color: "white",
          display: "flex",
          fontSize: 28,
          fontWeight: 700,
          height: "100%",
          justifyContent: "center",
          width: "100%",
        }}
      >
        {initials}
      </div>
    ),
    storefrontIconSize,
  );
}

/* eslint-disable @next/next/no-img-element -- Satori renders standard img elements into the social PNG. */
import type { PublicSocialCardData } from "@/lib/social-card";
import { formatPrice } from "@/lib/utils";
import { Flower2 } from "lucide-react";

const COLORS = {
  amber: "#f4c477",
  cream: "#f7f5ec",
  deepGreen: "#07120e",
} as const;

function normalizeText(value: string | null, maxLength: number) {
  if (!value) {
    return null;
  }

  const normalized = value.trim().replace(/\s+/g, " ");
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 3).trim()}...`;
}

function getTitleFontSize(title: string) {
  const longestWordLength = Math.max(
    ...title.split(/\s+/).map((word) => word.length),
  );

  if (longestWordLength > 24) {
    return 46;
  }

  if (longestWordLength > 20) {
    return 52;
  }

  if (longestWordLength > 16) {
    return 58;
  }

  if (title.length <= 16) {
    return 80;
  }

  if (title.length <= 28) {
    return 72;
  }

  if (title.length <= 42) {
    return 62;
  }

  return 52;
}

function getAttributionFontSize(attribution: string) {
  if (attribution.length > 44) {
    return 19;
  }

  if (attribution.length > 34) {
    return 22;
  }

  return 25;
}

function getCardCopy(data: PublicSocialCardData) {
  switch (data.kind) {
    case "catalog":
      return {
        title: data.title,
        attribution: normalizeText(data.location, 44),
        stat: `${data.listingCount.toLocaleString()} ${data.listingCount === 1 ? "listing" : "listings"}`,
      };
    case "list":
      return {
        title: data.title,
        attribution: `From ${normalizeText(data.sellerTitle, 44) ?? "Daylily Catalog"}`,
        stat: `${data.listingCount.toLocaleString()} ${data.listingCount === 1 ? "listing" : "listings"}`,
      };
    case "listing":
      return {
        title: data.title,
        subtitle:
          [normalizeText(data.hybridizer, 42), normalizeText(data.year, 8)]
            .filter(Boolean)
            .join(", ") || null,
        attribution: `From ${normalizeText(data.sellerTitle, 44) ?? "Daylily Catalog"}`,
        stat:
          data.price && data.price > 0
            ? formatPrice(data.price)
            : "View listing",
      };
  }
}

function BrandMark() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        color: COLORS.cream,
        fontSize: 22,
        fontWeight: 700,
        letterSpacing: -0.4,
        textShadow: "0 2px 12px rgba(0, 0, 0, 0.55)",
      }}
    >
      <Flower2 size={32} color={COLORS.amber} />
      <span>Daylily Catalog</span>
    </div>
  );
}

function BloomPlaceholder() {
  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        backgroundImage:
          "radial-gradient(circle at 70% 35%, #f7d6a8 0%, #d46652 38%, #304f2c 100%)",
      }}
    />
  );
}

function SocialCardBackground({ imageUrl }: { imageUrl?: string }) {
  if (!imageUrl) {
    return <BloomPlaceholder />;
  }

  return (
    <img
      src={imageUrl}
      width={1200}
      height={630}
      alt=""
      style={{
        width: "100%",
        height: "100%",
        objectFit: "cover",
      }}
    />
  );
}

export function PublicSocialCard({ data }: { data: PublicSocialCardData }) {
  const copy = getCardCopy(data);
  const title = normalizeText(copy.title, 64) ?? "Daylily Catalog";
  const subtitle = "subtitle" in copy ? copy.subtitle : null;

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        color: COLORS.cream,
        backgroundColor: COLORS.deepGreen,
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 400,
          display: "flex",
          width: 800,
          height: "100%",
        }}
      >
        <SocialCardBackground imageUrl={data.imageUrls[0]} />
      </div>

      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          display: "flex",
          width: "100%",
          height: "100%",
          backgroundImage:
            "linear-gradient(90deg, #07120e 0%, #07120e 31%, rgba(7, 18, 14, 0.94) 35%, rgba(7, 18, 14, 0.62) 42%, rgba(7, 18, 14, 0.18) 51%, rgba(7, 18, 14, 0.02) 58%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 20,
          left: 20,
          display: "flex",
          width: 1160,
          height: 590,
          border: "2px solid rgba(247, 245, 236, 0.68)",
          borderRadius: 22,
        }}
      />

      <div
        style={{
          position: "relative",
          display: "flex",
          width: 700,
          height: "100%",
          flexDirection: "column",
          padding: "44px 0 60px 58px",
        }}
      >
        <BrandMark />

        <div
          style={{
            display: "flex",
            flex: 1,
            flexDirection: "column",
            justifyContent: "center",
            paddingTop: 28,
          }}
        >
          <div
            style={{
              display: "flex",
              maxHeight: subtitle ? 145 : 184,
              overflow: "hidden",
              color: COLORS.cream,
              fontSize: getTitleFontSize(title),
              fontWeight: 700,
              letterSpacing: -3,
              lineHeight: 0.98,
              wordBreak: "break-word",
              textShadow: "0 3px 22px rgba(0, 0, 0, 0.62)",
            }}
          >
            {title}
          </div>

          {subtitle && (
            <div
              style={{
                display: "flex",
                maxWidth: 560,
                maxHeight: 31,
                marginTop: 14,
                overflow: "hidden",
                color: COLORS.cream,
                fontSize: 25,
                fontWeight: 600,
                lineHeight: 1.15,
                whiteSpace: "nowrap",
                textShadow: "0 2px 14px rgba(0, 0, 0, 0.72)",
              }}
            >
              {subtitle}
            </div>
          )}

          <div
            style={{
              display: "flex",
              width: 150,
              height: 3,
              marginTop: subtitle ? 18 : 22,
              backgroundColor: COLORS.amber,
              boxShadow: "0 2px 10px rgba(0, 0, 0, 0.35)",
            }}
          />

          {copy.attribution && (
            <div
              style={{
                display: "flex",
                maxWidth: 590,
                maxHeight: 31,
                marginTop: 18,
                overflow: "hidden",
                color: COLORS.cream,
                fontSize: getAttributionFontSize(copy.attribution),
                fontWeight: 700,
                lineHeight: 1.15,
                whiteSpace: "nowrap",
                textShadow: "0 2px 14px rgba(0, 0, 0, 0.72)",
              }}
            >
              {normalizeText(copy.attribution, 52)}
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            color: COLORS.amber,
            fontSize: 25,
            fontWeight: 700,
            textShadow: "0 2px 14px rgba(0, 0, 0, 0.72)",
          }}
        >
          {copy.stat}
        </div>
      </div>
    </div>
  );
}

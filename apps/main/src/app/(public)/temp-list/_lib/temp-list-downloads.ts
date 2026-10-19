"use client";

import { TEMP_TEXT_CARD_COLORS, type TempPreviewRow } from "./temp-list";
import { getCultivarShareImagePath } from "@/lib/social-card";
import { toCultivarRouteSegment } from "@/lib/utils/cultivar-utils";
import { formatPrice } from "@/lib/utils";

export async function downloadTempListCards(
  rows: TempPreviewRow[],
  variant: "print" | "share",
  onProgress: (completed: number) => void,
) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "pt",
    format: "letter",
    compress: true,
  });
  const width = 792;
  const height = 612;
  const margin = 24;
  for (const [index, { listing, match }] of rows.entries()) {
    if (index > 0) pdf.addPage("letter", "landscape");
    pdf.setTextColor(20, 33, 24);
    pdf.setFontSize(12);
    const details = [
      listing.price !== null ? `Price: ${formatPrice(listing.price)}` : "",
      listing.description,
    ]
      .filter(Boolean)
      .join("\n");
    const lines = details
      ? (pdf.splitTextToSize(details, width - margin * 2) as string[])
      : [];
    const footerHeight = lines.length ? lines.length * 16 + 16 : 0;
    const imageWidth = Math.min(
      width - margin * 2,
      ((height - margin * 2 - footerHeight) * 1200) / 630,
    );
    if (imageWidth < 240)
      throw new Error(
        `The description for ${listing.name} is too long for one page. Shorten it before downloading cards.`,
      );
    const imageHeight = (imageWidth * 630) / 1200;
    const left = (width - imageWidth) / 2;
    if (match) {
      const segment = toCultivarRouteSegment(match.normalizedName)!;
      const response = await fetch(getCultivarShareImagePath(segment, variant));
      if (!response.ok)
        throw new Error(
          `Could not load the card for ${listing.name}. Try again.`,
        );
      pdf.addImage(
        new Uint8Array(await response.arrayBuffer()),
        "PNG",
        left,
        margin,
        imageWidth,
        imageHeight,
      );
    } else {
      const colors = TEMP_TEXT_CARD_COLORS[variant];
      const padding = 16;
      const explanation =
        "No cultivar linked. Reference photo and registered details are unavailable.";
      let titleSize = 24;
      let titleLines: string[] = [];
      let explanationLines: string[] = [];
      let titleHeight = 0;
      for (; titleSize >= 8; titleSize -= 2) {
        pdf.setFontSize(titleSize);
        titleLines = pdf.splitTextToSize(
          listing.name,
          imageWidth - padding * 2,
        ) as string[];
        titleHeight = titleLines.length * titleSize * 1.15;
        pdf.setFontSize(titleSize / 2);
        explanationLines = pdf.splitTextToSize(
          explanation,
          imageWidth - padding * 2,
        ) as string[];
        const contentHeight =
          padding * 2 +
          titleHeight +
          12 +
          explanationLines.length * (titleSize / 2) * 1.15;
        if (contentHeight <= imageHeight) break;
      }
      pdf.setFillColor(colors.background);
      pdf.rect(left, margin, imageWidth, imageHeight, "F");
      pdf.setTextColor(colors.ink);
      pdf.setFontSize(titleSize);
      pdf.text(titleLines, left + padding, margin + padding + titleSize, {
        lineHeightFactor: 1.15,
      });
      pdf.setFontSize(titleSize / 2);
      pdf.text(
        explanationLines,
        left + padding,
        margin + padding + titleHeight + 12 + titleSize / 2,
        { lineHeightFactor: 1.15 },
      );
    }
    if (lines.length) {
      pdf.setTextColor(20, 33, 24);
      pdf.setFontSize(12);
      pdf.text(lines, margin, margin + imageHeight + 24, {
        lineHeightFactor: 1.33,
      });
    }
    onProgress(index + 1);
  }
  pdf.save(`temp-list-${variant === "print" ? "light" : "dark"}-cards.pdf`);
}

"use client";

import { TEMP_TEXT_CARD_COLORS, type TempPreviewRow } from "./temp-list";
import { getCultivarShareImagePath } from "@/lib/social-card";
import { toCultivarRouteSegment } from "@/lib/utils/cultivar-utils";
import { formatPrice } from "@/lib/utils";

export async function generateTempCatalogPdf({
  rows,
  variant,
  cardsPerPage,
  onProgress,
  imageCache,
  signal,
}: {
  rows: TempPreviewRow[];
  variant: "print" | "share";
  cardsPerPage: 1 | 2 | 4;
  onProgress: (completed: number) => void;
  imageCache: Map<string, Uint8Array>;
  signal: AbortSignal;
}) {
  signal.throwIfAborted();
  if (rows.length === 0) throw new Error("Add a flower before creating a PDF.");
  const { jsPDF } = await import("jspdf");
  signal.throwIfAborted();
  const orientation = cardsPerPage === 1 ? "landscape" : "portrait";
  const pdf = new jsPDF({
    orientation,
    unit: "pt",
    format: "letter",
    compress: true,
  });
  const width = pdf.internal.pageSize.getWidth();
  const height = pdf.internal.pageSize.getHeight();
  const margin = 12;
  const gap = 4;
  const cellWidth = width - margin * 2;
  const cellHeight =
    (height - margin * 2 - gap * (cardsPerPage - 1)) / cardsPerPage;
  let top = margin;
  const fontSize = cardsPerPage === 4 ? 9 : 12;
  const lineHeight = fontSize * 1.33;
  for (const [index, { listing, match }] of rows.entries()) {
    signal.throwIfAborted();
    const slot = index % cardsPerPage;
    if (index > 0 && slot === 0) {
      pdf.addPage("letter", orientation);
      top = margin;
    }
    pdf.setTextColor(20, 33, 24);
    pdf.setFontSize(fontSize);
    const details = [
      listing.price !== null ? `Price: ${formatPrice(listing.price)}` : "",
      listing.description,
    ]
      .filter(Boolean)
      .join("\n");
    let imageWidth = cellWidth;
    let lines: string[] = [];
    let footerHeight = 0;
    while (true) {
      lines = details
        ? (pdf.splitTextToSize(details, imageWidth) as string[])
        : [];
      footerHeight = lines.length ? lines.length * lineHeight + 4 : 0;
      const fittedWidth = Math.min(
        cellWidth,
        ((cellHeight - footerHeight) * 1200) / 630,
      );
      if (fittedWidth < 240)
        throw new Error(
          `The description for ${listing.name} is too long. Shorten it or choose fewer cards per page.`,
        );
      if (fittedWidth >= imageWidth) break;
      imageWidth = fittedWidth;
    }
    let imageHeight = (imageWidth * 630) / 1200;
    const left = margin + (cellWidth - imageWidth) / 2;
    if (match) {
      const segment = toCultivarRouteSegment(match.normalizedName)!;
      const source = getCultivarShareImagePath(segment, variant);
      let image = imageCache.get(source);
      if (!image) {
        const response = await fetch(source, { signal });
        if (!response.ok)
          throw new Error(
            `Could not load the card for ${listing.name}. Try again.`,
          );
        image = new Uint8Array(await response.arrayBuffer());
        signal.throwIfAborted();
      }
      try {
        pdf.addImage(image, "PNG", left, top, imageWidth, imageHeight);
        imageCache.set(source, image);
      } catch {
        imageCache.delete(source);
        throw new Error(
          `Could not read the card for ${listing.name}. Try again.`,
        );
      }
    } else {
      const colors = TEMP_TEXT_CARD_COLORS[variant];
      const padding = 16;
      let titleSize = cardsPerPage === 4 ? 14 : 24;
      let titleLines: string[] = [];
      let titleHeight = 0;
      for (; titleSize >= 8; titleSize -= 2) {
        pdf.setFontSize(titleSize);
        titleLines = pdf.splitTextToSize(
          listing.name,
          imageWidth - padding * 2,
        ) as string[];
        titleHeight = titleLines.length * titleSize * 1.15;
        const contentHeight = padding * 2 + titleHeight;
        if (contentHeight <= imageHeight) break;
      }
      imageHeight = Math.min(imageHeight, padding * 2 + titleHeight);
      pdf.setFillColor(colors.background);
      pdf.rect(left, top, imageWidth, imageHeight, "F");
      pdf.setTextColor(colors.ink);
      pdf.setFontSize(titleSize);
      pdf.text(titleLines, left + padding, top + padding + titleSize, {
        lineHeightFactor: 1.15,
      });
    }
    if (lines.length) {
      pdf.setTextColor(20, 33, 24);
      pdf.setFontSize(fontSize);
      pdf.text(lines, left, top + imageHeight + fontSize + 4, {
        lineHeightFactor: 1.33,
      });
    }
    top += imageHeight + footerHeight + gap;
    onProgress(index + 1);
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
  signal.throwIfAborted();
  return pdf.output("blob");
}

export async function renderTempCatalogFirstPage(
  blob: Blob,
  signal: AbortSignal,
) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();
  signal.throwIfAborted();
  const task = pdfjs.getDocument({
    data: await blob.arrayBuffer(),
    useSystemFonts: true,
  });
  const cancel = () => {
    void task.destroy();
  };
  signal.addEventListener("abort", cancel, { once: true });
  try {
    const document = await task.promise;
    const page = await document.getPage(1);
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = window.document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    await page.render({ canvas, viewport }).promise;
    signal.throwIfAborted();
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (image) =>
          image
            ? resolve(image)
            : reject(new Error("Could not render the PDF preview.")),
        "image/png",
      ),
    );
  } finally {
    signal.removeEventListener("abort", cancel);
    await task.destroy();
  }
}

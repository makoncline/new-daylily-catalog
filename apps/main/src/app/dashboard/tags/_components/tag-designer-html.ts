"use client";

import {
  QR_SIZE_INCHES,
  TAG_SPACER_HEIGHT_INCHES,
  buildQrCodeSvgMarkup,
  resolveCellFontSizePx,
  resolveSheetMetrics,
} from "./tag-designer-model";
import type {
  ResolvedCell,
  TagPreviewData,
  TagSheetCreatorState,
} from "./tag-designer-model";

function cellStyleAsCss(cell: ResolvedCell) {
  return [
    `font-size: ${cell.fontSize}px`,
    `font-weight: ${cell.bold ? 700 : 400}`,
    `font-style: ${cell.italic ? "italic" : "normal"}`,
    `text-decoration: ${cell.underline ? "underline" : "none"}`,
    `text-align: ${cell.textAlign}`,
    `flex: ${cell.width} 1 0`,
    "overflow: hidden",
    "white-space: nowrap",
  ].join("; ");
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function createTagPrintDocumentHtml({
  tags,
  widthInches,
  heightInches,
  mode = "print",
}: {
  tags: TagPreviewData[];
  widthInches: number;
  heightInches: number;
  mode?: "print" | "raster";
}) {
  const isRasterMode = mode === "raster";
  const rowAlignItems = isRasterMode ? "start" : "baseline";
  const rowMarginTopPixels = isRasterMode ? 2 : 1;
  const cellLineHeight = isRasterMode ? 1.28 : 1.2;
  const cellPaddingTop = isRasterMode ? "0.03em" : "0";
  const cellPaddingBottom = isRasterMode ? "0.08em" : "0";

  const tagMarkup = tags
    .map((tag) => {
      const hasQrCode = Boolean(tag.qrCodeUrl);
      const rowsHtml = tag.rows
        .map((row) => {
          if (row.isSpacer) return `<div class="row spacer"></div>`;

          const cellsHtml = row.cells
            .map((cell) => {
              const fittedCell = {
                ...cell,
                fontSize: resolveCellFontSizePx(
                  cell,
                  row,
                  widthInches,
                  hasQrCode,
                ),
              };
              return `<div class="cell" style="${cellStyleAsCss(fittedCell)}">${escapeHtml(cell.text)}</div>`;
            })
            .join("");
          return `<div class="row">${cellsHtml}</div>`;
        })
        .join("");

      const qrSvgMarkup =
        tag.qrCodeUrl !== null && tag.qrCodeUrl !== undefined
          ? buildQrCodeSvgMarkup(tag.qrCodeUrl)
          : "";
      const qrHtml = qrSvgMarkup ? `<div class="qr">${qrSvgMarkup}</div>` : "";
      const hasQrClass = hasQrCode ? " has-qr" : "";

      return `<article class="tag${hasQrClass}"><div class="tag-content">${rowsHtml}</div>${qrHtml}</article>`;
    })
    .join("");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Daylily Tag Print</title>
    <style>
      * { box-sizing: border-box; }
      @page {
        size: ${widthInches}in ${heightInches}in;
        margin: 0;
      }
      html, body {
        margin: 0;
        padding: 0;
      }
      body {
        font-family: Arial, sans-serif;
        color: #111;
      }
      .sheet {
        margin: 0;
        padding: 0;
      }
      .tag {
        width: ${widthInches}in;
        height: ${heightInches}in;
        padding: 0.06in 0.08in;
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        align-items: center;
        column-gap: 0.08in;
        overflow: hidden;
        page-break-inside: avoid;
        break-inside: avoid;
        page-break-after: always;
        break-after: page;
      }
      .tag:last-of-type {
        page-break-after: auto;
        break-after: auto;
      }
      .tag.has-qr {
        grid-template-columns: minmax(0, 1fr) auto;
      }
      .tag-content {
        min-width: 0;
      }
      .row {
        display: flex;
        justify-content: space-between;
        column-gap: 0.06in;
        align-items: ${rowAlignItems};
      }
      .row + .row {
        margin-top: ${rowMarginTopPixels}px;
      }
      .row.spacer {
        height: ${TAG_SPACER_HEIGHT_INCHES}in;
      }
      .cell {
        min-width: 0;
        line-height: ${cellLineHeight};
        padding-top: ${cellPaddingTop};
        padding-bottom: ${cellPaddingBottom};
        white-space: nowrap;
        overflow: hidden;
        text-overflow: clip;
      }
      .row > .cell:only-child {
        width: 100%;
      }
      .qr {
        width: ${QR_SIZE_INCHES}in;
        height: ${QR_SIZE_INCHES}in;
        flex: none;
        background: #fff;
      }
      .qr svg {
        display: block;
        width: 100%;
        height: 100%;
      }
    </style>
  </head>
  <body>
    <main class="sheet">${tagMarkup}</main>
  </body>
</html>`;
}

export function getSheetMarkup({
  tags,
  sheetState,
  tagWidthInches,
  tagHeightInches,
}: {
  tags: TagPreviewData[];
  sheetState: TagSheetCreatorState;
  tagWidthInches: number;
  tagHeightInches: number;
}) {
  const sheetMetrics = resolveSheetMetrics(sheetState, {
    tagWidthInches,
    tagHeightInches,
  });
  if (!sheetMetrics.isValid) return null;

  const rowAlignItems = "baseline";
  const rowMarginTopPixels = 1;
  const cellLineHeight = 1.2;
  const cellPaddingTop = "0";
  const cellPaddingBottom = "0";
  const tagBorderCss = sheetState.printDashedBorders
    ? "1px dashed #d4d4d8"
    : "none";
  const slotWidthInches = sheetMetrics.slotWidthInches;
  const slotHeightInches = sheetMetrics.slotHeightInches;

  const sheetTags: TagPreviewData[][] = [];
  for (let index = 0; index < tags.length; index += sheetMetrics.tagsPerSheet) {
    sheetTags.push(tags.slice(index, index + sheetMetrics.tagsPerSheet));
  }

  const sheetMarkup = sheetTags
    .map((sheetTagList) => {
      const tagMarkup = sheetTagList
        .map((tag) => {
          const hasQrCode = Boolean(tag.qrCodeUrl);
          const rowsHtml = tag.rows
            .map((row) => {
              if (row.isSpacer) return `<div class="row spacer"></div>`;

              const cellsHtml = row.cells
                .map((cell) => {
                  const fittedCell = {
                    ...cell,
                    fontSize: resolveCellFontSizePx(
                      cell,
                      row,
                      slotWidthInches,
                      hasQrCode,
                    ),
                  };
                  return `<div class="cell" style="${cellStyleAsCss(fittedCell)}">${escapeHtml(cell.text)}</div>`;
                })
                .join("");
              return `<div class="row">${cellsHtml}</div>`;
            })
            .join("");

          const qrSvgMarkup =
            tag.qrCodeUrl !== null && tag.qrCodeUrl !== undefined
              ? buildQrCodeSvgMarkup(tag.qrCodeUrl)
              : "";
          const qrHtml = qrSvgMarkup
            ? `<div class="qr">${qrSvgMarkup}</div>`
            : "";
          const hasQrClass = hasQrCode ? " has-qr" : "";

          return `<article class="tag${hasQrClass}"><div class="tag-content">${rowsHtml}</div>${qrHtml}</article>`;
        })
        .join("");

      return `<section class="sheet-page">${tagMarkup}</section>`;
    })
    .join("");

  return {
    html: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Daylily Tag Sheets</title>
    <style>
      * { box-sizing: border-box; }
      @page {
        size: ${sheetState.pageWidthInches}in ${sheetState.pageHeightInches}in;
        margin: 0;
      }
      html, body {
        margin: 0;
        padding: 0;
      }
      body {
        font-family: Arial, sans-serif;
        color: #111;
      }
      .sheet-page {
        width: ${sheetState.pageWidthInches}in;
        height: ${sheetState.pageHeightInches}in;
        padding: ${sheetState.marginYInches}in ${sheetState.marginXInches}in;
        display: grid;
        grid-template-columns: repeat(${sheetState.columns}, ${slotWidthInches}in);
        grid-template-rows: repeat(${sheetState.rows}, ${slotHeightInches}in);
        column-gap: ${sheetState.paddingXInches}in;
        row-gap: ${sheetState.paddingYInches}in;
        page-break-after: always;
        break-after: page;
      }
      .sheet-page:last-of-type {
        page-break-after: auto;
        break-after: auto;
      }
      .tag {
        width: ${slotWidthInches}in;
        height: ${slotHeightInches}in;
        padding: 0.06in 0.08in;
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        align-items: center;
        column-gap: 0.08in;
        overflow: hidden;
        border: ${tagBorderCss};
      }
      .tag.has-qr {
        grid-template-columns: minmax(0, 1fr) auto;
      }
      .tag-content {
        min-width: 0;
      }
      .row {
        display: flex;
        justify-content: space-between;
        column-gap: 0.06in;
        align-items: ${rowAlignItems};
      }
      .row + .row {
        margin-top: ${rowMarginTopPixels}px;
      }
      .row.spacer {
        height: ${TAG_SPACER_HEIGHT_INCHES}in;
      }
      .cell {
        min-width: 0;
        line-height: ${cellLineHeight};
        padding-top: ${cellPaddingTop};
        padding-bottom: ${cellPaddingBottom};
        white-space: nowrap;
        overflow: hidden;
        text-overflow: clip;
      }
      .row > .cell:only-child {
        width: 100%;
      }
      .qr {
        width: ${QR_SIZE_INCHES}in;
        height: ${QR_SIZE_INCHES}in;
        flex: none;
        background: #fff;
      }
      .qr svg {
        display: block;
        width: 100%;
        height: 100%;
      }
    </style>
  </head>
  <body>${sheetMarkup}</body>
</html>`,
    metrics: sheetMetrics,
  };
}

export function createTagSheetDocumentHtml(args: {
  tags: TagPreviewData[];
  sheetState: TagSheetCreatorState;
  tagWidthInches: number;
  tagHeightInches: number;
}) {
  const rendered = getSheetMarkup(args);
  return rendered?.html ?? null;
}

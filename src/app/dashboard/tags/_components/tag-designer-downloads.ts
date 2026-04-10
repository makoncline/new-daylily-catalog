"use client";

import { toast } from "sonner";
import { chunkTags, resolveSheetMetrics } from "./tag-designer-model";
import type { TagPreviewData, TagSheetCreatorState } from "./tag-designer-model";
import {
  createTagPrintDocumentHtml,
  getSheetMarkup,
} from "./tag-designer-html";

interface PreparedTagDocumentFrame {
  cleanup: () => void;
  iframe: HTMLIFrameElement;
  iframeWindow: Window;
}

function prepareTagDocumentFrame(html: string): PreparedTagDocumentFrame | null {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const iframeWindow = iframe.contentWindow;
  const iframeDocument = iframe.contentDocument;
  if (!iframeWindow || !iframeDocument) {
    iframe.remove();
    return null;
  }

  iframeDocument.open();
  iframeDocument.write(html);
  iframeDocument.close();

  return {
    cleanup: () => {
      iframe.remove();
    },
    iframe,
    iframeWindow,
  };
}

export function printTagDocument(html: string) {
  const preparedFrame = prepareTagDocumentFrame(html);
  if (!preparedFrame) return;

  preparedFrame.iframeWindow.focus();
  preparedFrame.iframeWindow.print();
  window.setTimeout(() => {
    preparedFrame.cleanup();
  }, 500);
}

function waitForFrameRender(frameWindow: Window) {
  return new Promise<void>((resolve) => {
    frameWindow.requestAnimationFrame(() => {
      resolve();
    });
  });
}

function buildTagExportDateStamp() {
  return new Date().toISOString().slice(0, 10);
}

function buildTagsHtmlFilename() {
  return `daylily-tags-${buildTagExportDateStamp()}.html`;
}

export function buildTagSheetsHtmlFilename() {
  return `daylily-tag-sheets-${buildTagExportDateStamp()}.html`;
}

function buildTagSheetsPdfFilename() {
  return `daylily-tag-sheets-${buildTagExportDateStamp()}.pdf`;
}

function buildTagSheetImagesZipFilename() {
  return `daylily-tag-sheet-images-${buildTagExportDateStamp()}.zip`;
}

function buildTagsPdfFilename() {
  return `daylily-tags-${buildTagExportDateStamp()}.pdf`;
}

function buildTagImagesZipFilename() {
  return `daylily-tag-images-${buildTagExportDateStamp()}.zip`;
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function downloadTagDocumentHtml(
  html: string,
  filename: string = buildTagsHtmlFilename(),
) {
  const blob = new Blob([html], { type: "text/html;charset=utf-8;" });
  triggerBlobDownload(blob, filename);
}

type Html2CanvasRenderer = (
  element: HTMLElement,
  options: {
    backgroundColor: string;
    scale: number;
    foreignObjectRendering: boolean;
    logging: boolean;
    useCORS: boolean;
    width: number;
    height: number;
  },
) => Promise<HTMLCanvasElement>;

async function renderSingleTagCanvas(args: {
  tag: TagPreviewData;
  widthInches: number;
  heightInches: number;
  html2canvas: Html2CanvasRenderer;
}) {
  const html = createTagPrintDocumentHtml({
    tags: [args.tag],
    widthInches: args.widthInches,
    heightInches: args.heightInches,
    mode: "raster",
  });
  const preparedFrame = prepareTagDocumentFrame(html);
  if (!preparedFrame) return null;

  try {
    const frameDocument = preparedFrame.iframe.contentDocument;
    if (!frameDocument) return null;

    if (frameDocument.fonts) {
      await frameDocument.fonts.ready;
    }
    await waitForFrameRender(preparedFrame.iframeWindow);
    await waitForFrameRender(preparedFrame.iframeWindow);

    const tagElement = frameDocument.querySelector<HTMLElement>(".tag");
    if (!tagElement) return null;

    return args.html2canvas(tagElement, {
      backgroundColor: "#ffffff",
      scale: 3,
      foreignObjectRendering: true,
      logging: false,
      useCORS: true,
      width: tagElement.offsetWidth,
      height: tagElement.offsetHeight,
    });
  } finally {
    preparedFrame.cleanup();
  }
}

async function renderTagCanvasesForExport(args: {
  tags: TagPreviewData[];
  widthInches: number;
  heightInches: number;
}) {
  if (!args.tags.length) return null;

  try {
    const { default: html2canvas } = await import("html2canvas");
    const canvases: HTMLCanvasElement[] = [];

    for (const tag of args.tags) {
      const canvas = await renderSingleTagCanvas({
        tag,
        widthInches: args.widthInches,
        heightInches: args.heightInches,
        html2canvas,
      });
      if (!canvas) {
        toast.error("Unable to prepare tag export.");
        return null;
      }
      canvases.push(canvas);
    }

    return canvases;
  } catch (error) {
    console.error("Failed to render tag canvases for export", error);
    toast.error("Unable to render tag export.");
    return null;
  }
}

async function renderSingleSheetCanvas(args: {
  sheetTags: TagPreviewData[];
  sheetState: TagSheetCreatorState;
  tagWidthInches: number;
  tagHeightInches: number;
  html2canvas: Html2CanvasRenderer;
}) {
  const rendered = getSheetMarkup({
    tags: args.sheetTags,
    sheetState: args.sheetState,
    tagWidthInches: args.tagWidthInches,
    tagHeightInches: args.tagHeightInches,
  });
  if (!rendered) return null;

  const preparedFrame = prepareTagDocumentFrame(rendered.html);
  if (!preparedFrame) return null;

  try {
    const frameDocument = preparedFrame.iframe.contentDocument;
    if (!frameDocument) return null;

    if (frameDocument.fonts) {
      await frameDocument.fonts.ready;
    }
    await waitForFrameRender(preparedFrame.iframeWindow);
    await waitForFrameRender(preparedFrame.iframeWindow);

    const sheetElement = frameDocument.querySelector<HTMLElement>(".sheet-page");
    if (!sheetElement) return null;

    return args.html2canvas(sheetElement, {
      backgroundColor: "#ffffff",
      scale: 2,
      foreignObjectRendering: true,
      logging: false,
      useCORS: true,
      width: sheetElement.offsetWidth,
      height: sheetElement.offsetHeight,
    });
  } finally {
    preparedFrame.cleanup();
  }
}

async function renderSheetCanvasesForExport(args: {
  tags: TagPreviewData[];
  sheetState: TagSheetCreatorState;
  tagWidthInches: number;
  tagHeightInches: number;
}) {
  if (!args.tags.length) return null;

  const metrics = resolveSheetMetrics(args.sheetState, {
    tagWidthInches: args.tagWidthInches,
    tagHeightInches: args.tagHeightInches,
  });
  if (!metrics.isValid) return null;

  try {
    const { default: html2canvas } = await import("html2canvas");
    const canvases: HTMLCanvasElement[] = [];
    const sheets = chunkTags(args.tags, metrics.tagsPerSheet);

    for (const sheetTags of sheets) {
      const canvas = await renderSingleSheetCanvas({
        sheetTags,
        sheetState: args.sheetState,
        tagWidthInches: args.tagWidthInches,
        tagHeightInches: args.tagHeightInches,
        html2canvas,
      });
      if (!canvas) {
        toast.error("Unable to prepare sheet export.");
        return null;
      }
      canvases.push(canvas);
    }

    return canvases;
  } catch (error) {
    console.error("Failed to render sheet canvases for export", error);
    toast.error("Unable to render sheet export.");
    return null;
  }
}

function canvasToPngBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }
        reject(new Error("Canvas toBlob returned null"));
      },
      "image/png",
      1,
    );
  });
}

export async function downloadTagDocumentPdf(args: {
  tags: TagPreviewData[];
  widthInches: number;
  heightInches: number;
}) {
  const canvases = await renderTagCanvasesForExport(args);
  if (!canvases || canvases.length === 0) return false;

  try {
    const { jsPDF } = await import("jspdf");
    const pageWidthPoints = Number((args.widthInches * 72).toFixed(2));
    const pageHeightPoints = Number((args.heightInches * 72).toFixed(2));
    const pdf = new jsPDF({
      orientation:
        pageWidthPoints >= pageHeightPoints ? "landscape" : "portrait",
      unit: "pt",
      format: [pageWidthPoints, pageHeightPoints],
      compress: true,
    });

    canvases.forEach((canvas, index) => {
      if (index > 0) {
        pdf.addPage([pageWidthPoints, pageHeightPoints]);
      }
      pdf.addImage(
        canvas.toDataURL("image/png"),
        "PNG",
        0,
        0,
        pageWidthPoints,
        pageHeightPoints,
        undefined,
        "FAST",
      );
    });

    pdf.save(buildTagsPdfFilename());
    return true;
  } catch (error) {
    console.error("Failed to export tags as PDF", error);
    toast.error("Unable to export PDF.");
    return false;
  }
}

export async function downloadTagImagesZip(args: {
  tags: TagPreviewData[];
  widthInches: number;
  heightInches: number;
}) {
  const canvases = await renderTagCanvasesForExport(args);
  if (!canvases || canvases.length === 0) return false;

  try {
    const { default: JSZip } = await import("jszip");
    const zip = new JSZip();
    const folder = zip.folder("daylily-tags");

    for (const [index, canvas] of canvases.entries()) {
      const fileName = `tag-${String(index + 1).padStart(3, "0")}.png`;
      const blob = await canvasToPngBlob(canvas);
      folder?.file(fileName, blob);
    }

    const zipBlob = await zip.generateAsync({
      type: "blob",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });

    triggerBlobDownload(zipBlob, buildTagImagesZipFilename());
    return true;
  } catch (error) {
    console.error("Failed to export tag images zip", error);
    toast.error("Unable to export images.");
    return false;
  }
}

export async function downloadTagSheetsPdf(args: {
  tags: TagPreviewData[];
  sheetState: TagSheetCreatorState;
  tagWidthInches: number;
  tagHeightInches: number;
}) {
  const canvases = await renderSheetCanvasesForExport(args);
  if (!canvases || canvases.length === 0) return false;

  try {
    const { jsPDF } = await import("jspdf");
    const pageWidthPoints = Number((args.sheetState.pageWidthInches * 72).toFixed(2));
    const pageHeightPoints = Number(
      (args.sheetState.pageHeightInches * 72).toFixed(2),
    );
    const pdf = new jsPDF({
      orientation:
        pageWidthPoints >= pageHeightPoints ? "landscape" : "portrait",
      unit: "pt",
      format: [pageWidthPoints, pageHeightPoints],
      compress: true,
    });

    canvases.forEach((canvas, index) => {
      if (index > 0) {
        pdf.addPage([pageWidthPoints, pageHeightPoints]);
      }
      pdf.addImage(
        canvas.toDataURL("image/png"),
        "PNG",
        0,
        0,
        pageWidthPoints,
        pageHeightPoints,
        undefined,
        "FAST",
      );
    });

    pdf.save(buildTagSheetsPdfFilename());
    return true;
  } catch (error) {
    console.error("Failed to export tag sheets as PDF", error);
    toast.error("Unable to export sheet PDF.");
    return false;
  }
}

export async function downloadTagSheetImagesZip(args: {
  tags: TagPreviewData[];
  sheetState: TagSheetCreatorState;
  tagWidthInches: number;
  tagHeightInches: number;
}) {
  const canvases = await renderSheetCanvasesForExport(args);
  if (!canvases || canvases.length === 0) return false;

  try {
    const { default: JSZip } = await import("jszip");
    const zip = new JSZip();
    const folder = zip.folder("daylily-tag-sheets");

    for (const [index, canvas] of canvases.entries()) {
      const fileName = `sheet-${String(index + 1).padStart(3, "0")}.png`;
      const blob = await canvasToPngBlob(canvas);
      folder?.file(fileName, blob);
    }

    const zipBlob = await zip.generateAsync({
      type: "blob",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });

    triggerBlobDownload(zipBlob, buildTagSheetImagesZipFilename());
    return true;
  } catch (error) {
    console.error("Failed to export tag sheet images zip", error);
    toast.error("Unable to export sheet images.");
    return false;
  }
}

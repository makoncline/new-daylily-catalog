import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  downloadTagImagesZip,
  downloadTagDocumentPdf,
  mapWithConcurrency,
} from "@/app/dashboard/tags/_components/tag-designer-downloads";
import type { TagPreviewData } from "@/app/dashboard/tags/_components/tag-designer-model";

const {
  html2canvasMock,
  pdfAddImageMock,
  pdfSaveMock,
  zipFileMock,
  zipGenerateAsyncMock,
} = vi.hoisted(() => ({
  html2canvasMock: vi.fn(),
  pdfAddImageMock: vi.fn(),
  pdfSaveMock: vi.fn(),
  zipFileMock: vi.fn(),
  zipGenerateAsyncMock: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock("html2canvas", () => ({
  default: html2canvasMock,
}));

vi.mock("jspdf", () => ({
  jsPDF: vi.fn().mockImplementation(() => ({
    addImage: pdfAddImageMock,
    addPage: vi.fn(),
    save: pdfSaveMock,
  })),
}));

vi.mock("jszip", () => ({
  default: vi.fn().mockImplementation(() => ({
    folder: vi.fn(() => ({
      file: zipFileMock,
    })),
    generateAsync: zipGenerateAsyncMock,
  })),
}));

const tag: TagPreviewData = {
  id: "tag-1",
  qrCodeUrl: null,
  rows: [
    {
      id: "row-1",
      cells: [
        {
          id: "cell-1",
          text: "Little Miss Sunshine",
          width: 100,
          textAlign: "left",
          fontSize: 12,
          bold: false,
          italic: false,
          underline: false,
        },
      ],
    },
  ],
};

function mockHtml2CanvasWithDelayedFrameCheck() {
  html2canvasMock.mockImplementation(async (element: HTMLElement) => {
    const frameElement = element.ownerDocument.defaultView
      ?.frameElement as HTMLIFrameElement | null;

    await new Promise((resolve) => window.setTimeout(resolve, 0));

    if (!frameElement?.isConnected) {
      throw new Error("raster frame was removed before rendering completed");
    }

    const canvas = document.createElement("canvas");
    Object.defineProperty(canvas, "toDataURL", {
      value: () => "data:image/png;base64,tag",
    });
    Object.defineProperty(canvas, "toBlob", {
      value: (callback: BlobCallback) => {
        callback(new Blob(["png"], { type: "image/png" }));
      },
    });
    return canvas;
  });
}

describe("tag designer downloads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    URL.createObjectURL = vi.fn();
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:tag-download");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(
      () => undefined,
    );
    zipGenerateAsyncMock.mockResolvedValue(new Blob(["zip"]));
  });

  it("limits concurrent raster render work while preserving result order", async () => {
    let active = 0;
    let maxActive = 0;

    const results = await mapWithConcurrency([1, 2, 3, 4, 5], 2, async (item) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 1));
      active -= 1;

      return item * 10;
    });

    expect(maxActive).toBeLessThanOrEqual(2);
    expect(results).toEqual([10, 20, 30, 40, 50]);
  });

  it("keeps the hidden raster iframe mounted until html2canvas finishes", async () => {
    mockHtml2CanvasWithDelayedFrameCheck();

    const didDownload = await downloadTagDocumentPdf({
      tags: [tag],
      widthInches: 3,
      heightInches: 1,
    });

    expect(didDownload).toBe(true);
    expect(html2canvasMock).toHaveBeenCalledOnce();
    expect(pdfAddImageMock).toHaveBeenCalledOnce();
    expect(pdfSaveMock).toHaveBeenCalledOnce();
  });

  it("keeps the hidden raster iframe mounted until image ZIP rendering finishes", async () => {
    mockHtml2CanvasWithDelayedFrameCheck();

    const didDownload = await downloadTagImagesZip({
      tags: [tag],
      widthInches: 3,
      heightInches: 1,
    });

    expect(didDownload).toBe(true);
    expect(html2canvasMock).toHaveBeenCalledOnce();
    expect(zipFileMock).toHaveBeenCalledOnce();
    expect(zipGenerateAsyncMock).toHaveBeenCalledOnce();
  });
});

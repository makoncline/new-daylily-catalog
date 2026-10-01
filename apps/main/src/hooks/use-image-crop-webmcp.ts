import { useEffect, useRef } from "react";
import {
  convertToPercentCrop,
  convertToPixelCrop,
  type PercentCrop,
} from "react-image-crop";
import { registerWebMcpTools, toolResult } from "@/lib/webmcp";

interface ImageCropWebMcpOptions {
  crop: PercentCrop | undefined;
  width: number;
  height: number;
  minPx: number;
  maxOutputPx: number;
  isDisabled: boolean | undefined;
  onChange: (crop: PercentCrop) => void;
}

export function useImageCropWebMcp({
  crop,
  width,
  height,
  minPx,
  maxOutputPx,
  isDisabled,
  onChange,
}: ImageCropWebMcpOptions) {
  const current = useRef({ crop, isDisabled });
  useEffect(() => {
    current.current = { crop, isDisabled };
  }, [crop, isDisabled]);

  const hasCrop = Boolean(crop);
  useEffect(() => {
    if (!hasCrop || !width || !height) return;
    const controller = new AbortController();
    const minimum = Math.min(minPx, width, height);
    const getState = (selection: PercentCrop) => {
      const pixels = convertToPixelCrop(selection, width, height);
      const size = Math.round(pixels.width);
      return {
        image: { width, height },
        crop: {
          left: Math.round(pixels.x),
          top: Math.round(pixels.y),
          size,
        },
        minimumSize: minimum,
        outputSize: Math.min(maxOutputPx, size),
        disabled: current.current.isDisabled === true,
      };
    };

    void registerWebMcpTools(
      [
        {
          name: "daylily.get-image-crop",
          title: "Read Image Crop",
          description:
            "Read the open image cropper's source dimensions, square selection, minimum size and output size in original image pixels. Available only while an image is open for cropping.",
          inputSchema: {
            type: "object",
            additionalProperties: false,
            properties: {},
          },
          annotations: {
            readOnlyHint: true,
            destructiveHint: false,
            openWorldHint: false,
          },
          execute: async () => {
            const selection = current.current.crop;
            if (controller.signal.aborted || !selection)
              throw new Error(
                "The image crop closed. Read the current tool again.",
              );
            return toolResult(getState(selection));
          },
        },
        {
          name: "daylily.set-image-crop",
          title: "Set Image Crop",
          description:
            "Set the visible square crop in original image pixels. Read daylily.get-image-crop first for dimensions and limits. This changes only the preview selection. It does not upload, attach or save an image. Select Upload separately through the normal UI.",
          inputSchema: {
            type: "object",
            additionalProperties: false,
            required: ["left", "top", "size"],
            properties: {
              left: { type: "integer", minimum: 0 },
              top: { type: "integer", minimum: 0 },
              size: { type: "integer", minimum },
            },
          },
          annotations: {
            readOnlyHint: false,
            destructiveHint: false,
            openWorldHint: false,
            idempotentHint: true,
          },
          execute: async ({ left, top, size }) => {
            if (controller.signal.aborted || !current.current.crop)
              throw new Error(
                "The image crop closed. Read the current tool again.",
              );
            if (current.current.isDisabled)
              throw new Error("The image crop is disabled during upload.");
            if (
              typeof left !== "number" ||
              typeof top !== "number" ||
              typeof size !== "number" ||
              ![left, top, size].every(Number.isInteger) ||
              left < 0 ||
              top < 0 ||
              size < minimum ||
              left + size > width ||
              top + size > height
            ) {
              throw new Error(
                `Use whole pixels. The square must be at least ${minimum}px and stay inside the image.`,
              );
            }
            const next = convertToPercentCrop(
              { unit: "px", x: left, y: top, width: size, height: size },
              width,
              height,
            );
            current.current.crop = next;
            onChange(next);
            return toolResult(getState(next));
          },
        },
      ],
      controller.signal,
    );
    return () => controller.abort();
  }, [hasCrop, height, maxOutputPx, minPx, onChange, width]);
}

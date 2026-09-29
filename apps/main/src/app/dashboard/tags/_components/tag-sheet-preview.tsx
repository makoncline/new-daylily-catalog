"use client";

import { CSS_PIXELS_PER_INCH } from "./tag-designer-model";
import type {
  ResolvedSheetMetrics,
  TagPreviewData,
  TagSheetCreatorState,
} from "./tag-designer-model";
import { TagPreviewCard } from "./tag-preview";

export function TagSheetPreview({
  previewTags,
  sheetState,
  sheetMetrics,
}: {
  previewTags: TagPreviewData[];
  sheetState: TagSheetCreatorState;
  sheetMetrics: ResolvedSheetMetrics;
}) {
  const firstSheetPreviewTags = previewTags.slice(0, sheetMetrics.tagsPerSheet);
  const pageWidthPx = sheetState.pageWidthInches * CSS_PIXELS_PER_INCH;
  const pageHeightPx = sheetState.pageHeightInches * CSS_PIXELS_PER_INCH;
  const slotWidthPx = sheetMetrics.slotWidthInches * CSS_PIXELS_PER_INCH;
  const slotHeightPx = sheetMetrics.slotHeightInches * CSS_PIXELS_PER_INCH;
  const marginXPx = sheetState.marginXInches * CSS_PIXELS_PER_INCH;
  const marginYPx = sheetState.marginYInches * CSS_PIXELS_PER_INCH;
  const paddingXPx = sheetState.paddingXInches * CSS_PIXELS_PER_INCH;
  const paddingYPx = sheetState.paddingYInches * CSS_PIXELS_PER_INCH;
  const previewScale = pageWidthPx > 0 ? Math.min(560 / pageWidthPx, 1) : 1;

  return (
    <div className="flex flex-col gap-2">
      <h4 className="text-sm font-medium">Sheet Preview</h4>
      {sheetMetrics.isValid && firstSheetPreviewTags.length > 0 ? (
        <>
          <div className="overflow-auto py-1">
            <div
              className="mx-auto"
              style={{
                width: `${pageWidthPx * previewScale}px`,
                height: `${pageHeightPx * previewScale}px`,
              }}
            >
              <div
                className="origin-top-left"
                style={{
                  width: `${pageWidthPx}px`,
                  height: `${pageHeightPx}px`,
                  transform: `scale(${previewScale})`,
                }}
              >
                <div
                  className="border-border grid size-full content-start justify-start border bg-white"
                  style={{
                    padding: `${marginYPx}px ${marginXPx}px`,
                    gridTemplateColumns: `repeat(${sheetState.columns}, ${slotWidthPx}px)`,
                    gridTemplateRows: `repeat(${sheetState.rows}, ${slotHeightPx}px)`,
                    columnGap: `${paddingXPx}px`,
                    rowGap: `${paddingYPx}px`,
                  }}
                >
                  {firstSheetPreviewTags.map((tag) => (
                    <TagPreviewCard
                      key={`sheet-preview-${tag.id}`}
                      tag={tag}
                      widthInches={sheetMetrics.slotWidthInches}
                      heightInches={sheetMetrics.slotHeightInches}
                      className="border-muted-foreground/40"
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
          {previewTags.length > sheetMetrics.tagsPerSheet ? (
            <p className="text-muted-foreground text-xs">
              Preview shows the first sheet only.
            </p>
          ) : null}
        </>
      ) : (
        <p className="text-muted-foreground text-sm">
          {previewTags.length === 0
            ? "Select listings below to preview sheet output."
            : "Adjust settings so the selected page can fit the tag grid."}
        </p>
      )}
    </div>
  );
}

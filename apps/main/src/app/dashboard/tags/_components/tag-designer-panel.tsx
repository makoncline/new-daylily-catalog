"use client";

import { TagDesignerControls } from "./tag-designer-controls";
import { TagDesignerOutputActions } from "./tag-output-actions";
import { TagDesignerPreview } from "./tag-preview";
import { TagSheetCreatorDialog } from "./tag-sheet-dialog";
import { useTagDesignerController } from "./use-tag-designer-controller";
import type { TagListingData } from "./tag-designer-model";

export {
  createTagPrintDocumentHtml,
  createTagSheetDocumentHtml,
} from "./tag-designer-export";
export type { TagListingData } from "./tag-designer-model";

export function TagDesignerPanel({ listings }: { listings: TagListingData[] }) {
  const { controlsProps, headerProps, previewProps, sheetCreatorDialogProps } =
    useTagDesignerController({ listings });

  return (
    <section
      aria-labelledby="tag-designer-title"
      className="mx-auto w-full max-w-5xl space-y-6"
    >
      <div className="space-y-2">
        <h2 id="tag-designer-title" className="text-base font-semibold">
          Tag designer
        </h2>
        <p className="text-muted-foreground text-sm">
          {headerProps.selectedListingCount} selected listing
          {headerProps.selectedListingCount === 1 ? "" : "s"}. Choose the tag
          content, check the preview, then print.
        </p>
      </div>
      <TagSheetCreatorDialog {...sheetCreatorDialogProps} />
      <TagDesignerControls {...controlsProps} />
      <TagDesignerPreview {...previewProps} />
      <TagDesignerOutputActions {...headerProps} />
    </section>
  );
}

"use client";

import { TagDesignerControls } from "./tag-designer-controls";
import { TagDesignerOutputActions } from "./tag-output-actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    <section aria-labelledby="tag-designer-title">
      <Card className="mx-auto w-full max-w-5xl">
        <CardHeader>
          <CardTitle>
            <h2 id="tag-designer-title">Tag designer</h2>
          </CardTitle>
          <CardDescription>
            {headerProps.selectedListingCount} selected listing
            {headerProps.selectedListingCount === 1 ? "" : "s"}. Choose the tag
            content, check the preview, then print.
          </CardDescription>
        </CardHeader>
        <TagSheetCreatorDialog {...sheetCreatorDialogProps} />
        <CardContent>
          <div className="flex flex-col gap-6">
            <TagDesignerControls {...controlsProps} />
            <TagDesignerPreview {...previewProps} />
          </div>
        </CardContent>
        <CardFooter>
          <TagDesignerOutputActions {...headerProps} />
        </CardFooter>
      </Card>
    </section>
  );
}

"use client";

import {
  ChevronDown,
  Download,
  FileDown,
  FileImage,
  FileText,
  LayoutGrid,
  Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface TagDesignerHeaderProps {
  selectedListingCount: number;
  onDownloadCsv: () => void;
  onDownloadPages: () => void;
  onDownloadPdf: () => void;
  onDownloadImages: () => void;
  onOpenSheetCreator: () => void;
  onPrint: () => void;
  isPreparingDownload: boolean;
}

export function TagDesignerOutputActions({
  selectedListingCount,
  onDownloadCsv,
  onDownloadPages,
  onDownloadPdf,
  onDownloadImages,
  onOpenSheetCreator,
  onPrint,
  isPreparingDownload,
}: TagDesignerHeaderProps) {
  const hasListings = selectedListingCount > 0;

  return (
    <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-muted-foreground text-sm">
        Print at 100% or Actual size.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          onClick={onOpenSheetCreator}
          disabled={!hasListings}
        >
          <LayoutGrid data-icon="inline-start" />
          Make sheet
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              disabled={!hasListings || isPreparingDownload}
            >
              {isPreparingDownload ? (
                <Spinner data-icon="inline-start" />
              ) : null}
              {isPreparingDownload ? "Preparing…" : "Output options"}
              <ChevronDown data-icon="inline-end" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuGroup>
              <DropdownMenuItem
                onSelect={() => onDownloadPages()}
                disabled={isPreparingDownload}
              >
                <FileDown />
                Pages (.html)
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => onDownloadPdf()}
                disabled={isPreparingDownload}
              >
                <FileText />
                PDF (.pdf)
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => onDownloadImages()}
                disabled={isPreparingDownload}
              >
                <FileImage />
                Images (.zip)
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => onDownloadCsv()}
                disabled={isPreparingDownload}
              >
                <Download />
                CSV
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button onClick={onPrint} disabled={!hasListings}>
          <Printer data-icon="inline-start" />
          Print
        </Button>
      </div>
    </div>
  );
}

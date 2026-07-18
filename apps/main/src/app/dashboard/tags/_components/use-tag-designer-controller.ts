"use client";

import * as React from "react";
import { toast } from "sonner";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { getBaseUrl } from "@/lib/utils/getBaseUrl";
import {
  BUILTIN_TAG_LAYOUT_TEMPLATES,
  DEFAULT_TAG_DESIGNER_STATE,
  MAX_SHEET_COPIES_PER_LABEL,
  MIN_SHEET_COPIES_PER_LABEL,
  PLACEHOLDER_LISTING,
  TAG_DESIGNER_STORAGE_KEY,
  TAG_SHEET_CREATOR_STORAGE_KEY,
  TAG_SIZE_PRESETS,
  TAG_TEMPLATE_LIBRARY_STORAGE_KEY,
  TEMPLATE_CUSTOM_ID,
  applyTagTextTemplate,
  buildPublicListingUrl,
  buildResolvedRowsForListing,
  createDefaultSheetCreatorState,
  createLayoutSignature,
  downloadSelectedListingsCsv,
  duplicateTagsForSheetLabels,
  resolveSheetMetrics,
  sanitizeStoredTemplate,
  sanitizeTagDesignerState,
  sanitizeTagSheetCreatorState,
  tagDesignerStateToTemplateText,
} from "./tag-designer-model";
import type {
  ResolvedTagLayoutTemplate,
  StoredTagLayoutTemplate,
  TagDesignerState,
  TagListingData,
  TagPreviewData,
  TagSheetCreatorState,
} from "./tag-designer-model";
import {
  buildTagSheetsHtmlFilename,
  createTagPrintDocumentHtml,
  createTagSheetDocumentHtml,
  downloadTagDocumentHtml,
  downloadTagDocumentPdf,
  downloadTagImagesZip,
  downloadTagSheetImagesZip,
  downloadTagSheetsPdf,
  printTagDocument,
} from "./tag-designer-export";

export function useTagDesignerController({
  listings,
}: {
  listings: TagListingData[];
}) {
  const [isPreparingDownload, setIsPreparingDownload] = React.useState(false);
  const [isSheetCreatorOpen, setIsSheetCreatorOpen] = React.useState(false);
  const [sheetCopiesPerLabel, setSheetCopiesPerLabel] = React.useState(
    MIN_SHEET_COPIES_PER_LABEL,
  );
  const [storedState, setStoredState] = useLocalStorage<TagDesignerState>(
    TAG_DESIGNER_STORAGE_KEY,
    DEFAULT_TAG_DESIGNER_STATE,
  );
  const [storedUserTemplates, setStoredUserTemplates] = useLocalStorage<
    StoredTagLayoutTemplate[]
  >(TAG_TEMPLATE_LIBRARY_STORAGE_KEY, []);
  const [storedSheetState, setStoredSheetState] =
    useLocalStorage<TagSheetCreatorState>(
      TAG_SHEET_CREATOR_STORAGE_KEY,
      createDefaultSheetCreatorState({
        tagWidthInches: DEFAULT_TAG_DESIGNER_STATE.customWidthInches,
        tagHeightInches: DEFAULT_TAG_DESIGNER_STATE.customHeightInches,
      }),
    );
  const baseUrl = React.useMemo(() => getBaseUrl(), []);

  const state = React.useMemo(
    () => sanitizeTagDesignerState(storedState),
    [storedState],
  );

  const updateState = React.useCallback(
    (updater: (previous: TagDesignerState) => TagDesignerState) => {
      setStoredState((previous) => {
        const normalized = sanitizeTagDesignerState(previous);
        return sanitizeTagDesignerState(updater(normalized));
      });
    },
    [setStoredState],
  );

  const userTemplates = React.useMemo(() => {
    if (!Array.isArray(storedUserTemplates)) return [];
    return storedUserTemplates
      .map((template) => sanitizeStoredTemplate(template))
      .filter(
        (template): template is StoredTagLayoutTemplate => template !== null,
      );
  }, [storedUserTemplates]);

  const builtinTemplates = React.useMemo<ResolvedTagLayoutTemplate[]>(
    () =>
      BUILTIN_TAG_LAYOUT_TEMPLATES.map((template) => ({
        ...template,
        layout: sanitizeTagDesignerState(template.layout),
        isBuiltin: true,
        signature: createLayoutSignature(template.layout),
      })),
    [],
  );

  const allTemplates = React.useMemo<ResolvedTagLayoutTemplate[]>(
    () => [
      ...builtinTemplates,
      ...userTemplates.map((template) => ({
        ...template,
        isBuiltin: false,
        signature: createLayoutSignature(template.layout),
      })),
    ],
    [builtinTemplates, userTemplates],
  );

  const matchedTemplate = React.useMemo(() => {
    const signature = createLayoutSignature(state);
    return (
      allTemplates.find((template) => template.signature === signature) ?? null
    );
  }, [allTemplates, state]);

  const isCustomLayout = matchedTemplate === null;
  const selectedTemplateId = matchedTemplate?.id ?? TEMPLATE_CUSTOM_ID;
  const customTemplateText = React.useMemo(
    () => tagDesignerStateToTemplateText(state),
    [state],
  );

  const handleTemplateSelectChange = React.useCallback(
    (nextTemplateId: string) => {
      if (nextTemplateId === TEMPLATE_CUSTOM_ID) return;

      const template = allTemplates.find(
        (candidate) => candidate.id === nextTemplateId,
      );
      if (!template) return;

      setStoredState((previous) => {
        const normalizedPrevious = sanitizeTagDesignerState(previous);
        const normalizedTemplate = sanitizeTagDesignerState(template.layout);
        const currentPreset =
          TAG_SIZE_PRESETS.find(
            (preset) => preset.id === normalizedPrevious.sizePresetId,
          ) ?? TAG_SIZE_PRESETS[0]!;
        const templatePreset =
          TAG_SIZE_PRESETS.find(
            (preset) => preset.id === normalizedTemplate.sizePresetId,
          ) ?? TAG_SIZE_PRESETS[0]!;
        const currentWidth =
          currentPreset.id === "custom"
            ? normalizedPrevious.customWidthInches
            : currentPreset.widthInches;
        const currentHeight =
          currentPreset.id === "custom"
            ? normalizedPrevious.customHeightInches
            : currentPreset.heightInches;
        const templateWidth =
          templatePreset.id === "custom"
            ? normalizedTemplate.customWidthInches
            : templatePreset.widthInches;
        const templateHeight =
          templatePreset.id === "custom"
            ? normalizedTemplate.customHeightInches
            : templatePreset.heightInches;
        const recommendedSizeDoesNotShrink =
          templateWidth >= currentWidth && templateHeight >= currentHeight;
        const shouldUseRecommendedSize =
          recommendedSizeDoesNotShrink &&
          (templateWidth > currentWidth || templateHeight > currentHeight);

        return sanitizeTagDesignerState({
          ...normalizedPrevious,
          ...(shouldUseRecommendedSize
            ? {
                sizePresetId: normalizedTemplate.sizePresetId,
                customWidthInches: normalizedTemplate.customWidthInches,
                customHeightInches: normalizedTemplate.customHeightInches,
              }
            : {}),
          rows: normalizedTemplate.rows,
        });
      });
    },
    [allTemplates, setStoredState],
  );

  const handleCustomTemplateChange = React.useCallback(
    (template: string) => {
      updateState((previous) => applyTagTextTemplate(previous, template));
    },
    [updateState],
  );

  const handleSaveTemplate = React.useCallback(
    (inputName: string, sourceTemplateId?: string) => {
      const name = inputName.trim();
      if (!name) {
        toast.error("Template name is required.");
        return false;
      }

      const sourceTemplate = sourceTemplateId
        ? userTemplates.find((template) => template.id === sourceTemplateId)
        : null;
      const existingByName =
        sourceTemplate ??
        userTemplates.find(
          (template) => template.name.toLowerCase() === name.toLowerCase(),
        ) ??
        (matchedTemplate && !matchedTemplate.isBuiltin
          ? matchedTemplate
          : null);
      const templateId =
        existingByName?.id ?? `user-template-${Date.now().toString(36)}`;
      const layout = sanitizeTagDesignerState(state);

      setStoredUserTemplates((previous) => {
        const sanitizedPrevious = (Array.isArray(previous) ? previous : [])
          .map((template) => sanitizeStoredTemplate(template))
          .filter(
            (template): template is StoredTagLayoutTemplate =>
              template !== null,
          );

        if (existingByName) {
          return sanitizedPrevious.map((template) =>
            template.id === existingByName.id
              ? { ...template, name, layout }
              : template,
          );
        }

        return [...sanitizedPrevious, { id: templateId, name, layout }];
      });

      toast.success(existingByName ? "Template updated." : "Template saved.");
      return true;
    },
    [matchedTemplate, setStoredUserTemplates, state, userTemplates],
  );

  const handleDeleteTemplate = React.useCallback(
    (templateId: string, templateName: string) => {
      const shouldDelete = window.confirm(`Delete template "${templateName}"?`);
      if (!shouldDelete) return false;

      setStoredUserTemplates((previous) =>
        (Array.isArray(previous) ? previous : [])
          .map((template) => sanitizeStoredTemplate(template))
          .filter(
            (template): template is StoredTagLayoutTemplate =>
              template !== null && template.id !== templateId,
          ),
      );
      toast.success("Template deleted.");
      return true;
    },
    [setStoredUserTemplates],
  );

  const activeSizePreset = React.useMemo(
    () =>
      TAG_SIZE_PRESETS.find((preset) => preset.id === state.sizePresetId) ??
      TAG_SIZE_PRESETS[0]!,
    [state.sizePresetId],
  );
  const widthInches =
    activeSizePreset.id === "custom"
      ? state.customWidthInches
      : activeSizePreset.widthInches;
  const heightInches =
    activeSizePreset.id === "custom"
      ? state.customHeightInches
      : activeSizePreset.heightInches;

  const sheetState = React.useMemo(
    () =>
      sanitizeTagSheetCreatorState(storedSheetState, {
        tagWidthInches: widthInches,
        tagHeightInches: heightInches,
      }),
    [heightInches, storedSheetState, widthInches],
  );

  const updateSheetState = React.useCallback(
    (updater: (previous: TagSheetCreatorState) => TagSheetCreatorState) => {
      setStoredSheetState((previous) => {
        const normalized = sanitizeTagSheetCreatorState(previous, {
          tagWidthInches: widthInches,
          tagHeightInches: heightInches,
        });
        return sanitizeTagSheetCreatorState(updater(normalized), {
          tagWidthInches: widthInches,
          tagHeightInches: heightInches,
        });
      });
    },
    [heightInches, setStoredSheetState, widthInches],
  );

  const sheetMetrics = React.useMemo(
    () =>
      resolveSheetMetrics(sheetState, {
        tagWidthInches: widthInches,
        tagHeightInches: heightInches,
      }),
    [heightInches, sheetState, widthInches],
  );

  const basePreviewTags = React.useMemo<TagPreviewData[]>(() => {
    const toPreview = listings.length > 0 ? listings : [PLACEHOLDER_LISTING];
    return toPreview.map((listing) => ({
      id: listing.id,
      rows: buildResolvedRowsForListing(listing, state.rows),
      qrCodeUrl:
        state.showQrCode && listing.userId
          ? buildPublicListingUrl(baseUrl, listing.userId, listing.id)
          : null,
    }));
  }, [baseUrl, listings, state.rows, state.showQrCode]);

  const sheetPreviewTags = React.useMemo(
    () =>
      duplicateTagsForSheetLabels(
        listings.length > 0 ? basePreviewTags : [],
        sheetCopiesPerLabel,
      ),
    [basePreviewTags, listings.length, sheetCopiesPerLabel],
  );

  const visiblePreviewTags = basePreviewTags.slice(0, 8);

  const resetLayout = React.useCallback(() => {
    setStoredState(DEFAULT_TAG_DESIGNER_STATE);
  }, [setStoredState]);

  const handleOpenSheetCreator = React.useCallback(() => {
    setSheetCopiesPerLabel(MIN_SHEET_COPIES_PER_LABEL);
    if (typeof window !== "undefined") {
      const existingSheetState = window.localStorage.getItem(
        TAG_SHEET_CREATOR_STORAGE_KEY,
      );
      if (!existingSheetState) {
        setStoredSheetState(
          createDefaultSheetCreatorState({
            tagWidthInches: widthInches,
            tagHeightInches: heightInches,
          }),
        );
      }
    }
    setIsSheetCreatorOpen(true);
  }, [heightInches, setStoredSheetState, widthInches]);

  const handleSheetCopiesPerLabelChange = React.useCallback(
    (nextCopiesPerLabel: number) => {
      setSheetCopiesPerLabel(
        Math.min(
          MAX_SHEET_COPIES_PER_LABEL,
          Math.max(MIN_SHEET_COPIES_PER_LABEL, Math.floor(nextCopiesPerLabel)),
        ),
      );
    },
    [],
  );

  const handleResetSheetToSingleTag = React.useCallback(() => {
    setStoredSheetState(
      createDefaultSheetCreatorState({
        tagWidthInches: widthInches,
        tagHeightInches: heightInches,
      }),
    );
  }, [heightInches, setStoredSheetState, widthInches]);

  const createSheetHtml = React.useCallback(() => {
    if (!listings.length) {
      toast.error("Select at least one listing in the table before printing.");
      return null;
    }
    if (!sheetMetrics.isValid) {
      toast.error("Adjust sheet settings so the tag grid fits the page.");
      return null;
    }

    return createTagSheetDocumentHtml({
      tags: sheetPreviewTags,
      sheetState,
      tagWidthInches: widthInches,
      tagHeightInches: heightInches,
    });
  }, [
    heightInches,
    listings.length,
    sheetPreviewTags,
    sheetMetrics.isValid,
    sheetState,
    widthInches,
  ]);

  const isSheetExportReady = React.useCallback(() => {
    if (!listings.length) {
      toast.error(
        "Select at least one listing in the table before downloading.",
      );
      return false;
    }
    if (!sheetMetrics.isValid) {
      toast.error("Adjust sheet settings so the tag grid fits the page.");
      return false;
    }
    return true;
  }, [listings.length, sheetMetrics.isValid]);

  const handlePrint = React.useCallback(() => {
    if (!listings.length) {
      toast.error("Select at least one listing in the table before printing.");
      return;
    }

    const html = createTagPrintDocumentHtml({
      tags: basePreviewTags,
      widthInches,
      heightInches,
    });

    printTagDocument(html);
  }, [basePreviewTags, heightInches, listings.length, widthInches]);

  const handleDownloadSheetPages = React.useCallback(() => {
    if (isPreparingDownload) return;
    const html = createSheetHtml();
    if (!html) return;

    downloadTagDocumentHtml(html, buildTagSheetsHtmlFilename());
    toast.success("Sheet pages download started.");
  }, [createSheetHtml, isPreparingDownload]);

  const handleDownloadSheetPdf = React.useCallback(async () => {
    if (isPreparingDownload) return;
    if (!isSheetExportReady()) return;

    setIsPreparingDownload(true);
    try {
      const didDownload = await downloadTagSheetsPdf({
        tags: sheetPreviewTags,
        sheetState,
        tagWidthInches: widthInches,
        tagHeightInches: heightInches,
      });
      if (didDownload) {
        toast.success("Sheet PDF download started.");
      }
    } finally {
      setIsPreparingDownload(false);
    }
  }, [
    heightInches,
    isPreparingDownload,
    isSheetExportReady,
    sheetPreviewTags,
    sheetState,
    widthInches,
  ]);

  const handleDownloadSheetImages = React.useCallback(async () => {
    if (isPreparingDownload) return;
    if (!isSheetExportReady()) return;

    setIsPreparingDownload(true);
    try {
      const didDownload = await downloadTagSheetImagesZip({
        tags: sheetPreviewTags,
        sheetState,
        tagWidthInches: widthInches,
        tagHeightInches: heightInches,
      });
      if (didDownload) {
        toast.success("Sheet images download started.");
      }
    } finally {
      setIsPreparingDownload(false);
    }
  }, [
    heightInches,
    isPreparingDownload,
    isSheetExportReady,
    sheetPreviewTags,
    sheetState,
    widthInches,
  ]);

  const handlePrintSheets = React.useCallback(() => {
    if (!isSheetExportReady()) return;
    const html = createSheetHtml();
    if (!html) return;

    printTagDocument(html);
  }, [createSheetHtml, isSheetExportReady]);

  const handleDownloadPages = React.useCallback(() => {
    if (isPreparingDownload) return;
    if (!listings.length) {
      toast.error(
        "Select at least one listing in the table before downloading.",
      );
      return;
    }

    const html = createTagPrintDocumentHtml({
      tags: basePreviewTags,
      widthInches,
      heightInches,
    });
    downloadTagDocumentHtml(html);
    toast.success("Pages download started.");
  }, [
    basePreviewTags,
    heightInches,
    isPreparingDownload,
    listings.length,
    widthInches,
  ]);

  const handleDownloadPdf = React.useCallback(async () => {
    if (isPreparingDownload) return;
    if (!listings.length) {
      toast.error(
        "Select at least one listing in the table before downloading.",
      );
      return;
    }

    setIsPreparingDownload(true);
    try {
      const didDownload = await downloadTagDocumentPdf({
        tags: basePreviewTags,
        widthInches,
        heightInches,
      });
      if (didDownload) {
        toast.success("PDF download started.");
      }
    } finally {
      setIsPreparingDownload(false);
    }
  }, [
    basePreviewTags,
    heightInches,
    isPreparingDownload,
    listings.length,
    widthInches,
  ]);

  const handleDownloadImages = React.useCallback(async () => {
    if (isPreparingDownload) return;
    if (!listings.length) {
      toast.error(
        "Select at least one listing in the table before downloading.",
      );
      return;
    }

    setIsPreparingDownload(true);
    try {
      const didDownload = await downloadTagImagesZip({
        tags: basePreviewTags,
        widthInches,
        heightInches,
      });
      if (didDownload) {
        toast.success("Images download started.");
      }
    } finally {
      setIsPreparingDownload(false);
    }
  }, [
    basePreviewTags,
    heightInches,
    isPreparingDownload,
    listings.length,
    widthInches,
  ]);

  const handleDownloadCsv = React.useCallback(() => {
    downloadSelectedListingsCsv(listings, state.rows);
  }, [listings, state.rows]);

  return {
    controlsProps: {
      builtinTemplates,
      customTemplateText,
      heightInches,
      isCustomLayout,
      onApplyTemplate: handleTemplateSelectChange,
      onCustomTemplateChange: handleCustomTemplateChange,
      onDeleteTemplate: handleDeleteTemplate,
      onResetLayout: resetLayout,
      onSaveTemplate: handleSaveTemplate,
      selectedTemplateId,
      state,
      updateState,
      userTemplates,
      widthInches,
    },
    headerProps: {
      isPreparingDownload,
      onDownloadCsv: handleDownloadCsv,
      onDownloadImages: () => void handleDownloadImages(),
      onDownloadPages: handleDownloadPages,
      onDownloadPdf: () => void handleDownloadPdf(),
      onOpenSheetCreator: handleOpenSheetCreator,
      onPrint: handlePrint,
      selectedListingCount: listings.length,
    },
    previewProps: {
      heightInches,
      listingsCount: listings.length,
      previewTags: basePreviewTags,
      visiblePreviewTags,
      widthInches,
    },
    sheetCreatorDialogProps: {
      copiesPerLabel: sheetCopiesPerLabel,
      isPreparingDownload,
      onCopiesPerLabelChange: handleSheetCopiesPerLabelChange,
      onDownloadSheetImages: () => void handleDownloadSheetImages(),
      onDownloadSheetPages: handleDownloadSheetPages,
      onDownloadSheetPdf: () => void handleDownloadSheetPdf(),
      onOpenChange: setIsSheetCreatorOpen,
      onPrintSheets: handlePrintSheets,
      onResetToSingleTag: handleResetSheetToSingleTag,
      open: isSheetCreatorOpen,
      previewTags: sheetPreviewTags,
      selectedLabelCount: listings.length,
      sheetMetrics,
      sheetState,
      updateSheetState,
    },
  };
}

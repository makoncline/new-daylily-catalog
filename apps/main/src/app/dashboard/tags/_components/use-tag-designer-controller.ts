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
  TEMPLATE_IMPORT_ID,
  buildPublicListingUrl,
  buildResolvedRowsForListing,
  createDefaultCell,
  createDefaultSheetCreatorState,
  createLayoutSignature,
  downloadSelectedListingsCsv,
  duplicateTagsForSheetLabels,
  generateRowId,
  resolveSheetMetrics,
  sanitizeStoredTemplate,
  sanitizeTagDesignerState,
  sanitizeTagSheetCreatorState,
} from "./tag-designer-model";
import type {
  ResolvedTagLayoutTemplate,
  StoredTagLayoutTemplate,
  TagCell,
  TagDesignerState,
  TagListingData,
  TagPreviewData,
  TagRow,
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
  const [isTemplatePickerOpen, setIsTemplatePickerOpen] = React.useState(false);

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
      .filter((template): template is StoredTagLayoutTemplate => template !== null);
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
    return allTemplates.find((template) => template.signature === signature) ?? null;
  }, [allTemplates, state]);

  const matchedTemplateName = matchedTemplate?.name ?? "custom";
  const isCustomLayout = matchedTemplate === null;
  const selectedTemplateId = matchedTemplate?.id ?? TEMPLATE_CUSTOM_ID;
  const selectedTemplateLabel = matchedTemplate?.name ?? "Custom";

  const handleShareTemplate = React.useCallback(async () => {
    const templatePayload = JSON.stringify({
      version: 1,
      layout: sanitizeTagDesignerState(state),
    });

    try {
      if (
        typeof navigator !== "undefined" &&
        typeof navigator.clipboard?.writeText === "function"
      ) {
        await navigator.clipboard.writeText(templatePayload);
        toast.success("Layout template copied as JSON.");
        return;
      }
    } catch (error) {
      console.error("Failed to copy layout template to clipboard", error);
    }

    window.prompt("Copy template JSON", templatePayload);
  }, [state]);

  const handleImportTemplate = React.useCallback(() => {
    const input = window.prompt("Paste shared template JSON");
    if (input === null) return;

    const trimmed = input.trim();
    if (trimmed.length === 0) {
      toast.error("Template JSON is empty.");
      return;
    }

    try {
      const parsed = JSON.parse(trimmed) as unknown;
      let candidate = parsed;

      if (parsed && typeof parsed === "object") {
        const record = parsed as Record<string, unknown>;
        if ("layout" in record) {
          candidate = record.layout;
        } else if ("state" in record) {
          candidate = record.state;
        }
      }

      if (!candidate || typeof candidate !== "object") {
        throw new Error("Template must be an object.");
      }

      if (!Array.isArray((candidate as Record<string, unknown>).rows)) {
        throw new Error("Template must include rows.");
      }

      setStoredState(sanitizeTagDesignerState(candidate as TagDesignerState));
      toast.success("Template imported.");
    } catch (error) {
      console.error("Failed to import template JSON", error);
      toast.error("Invalid template JSON.");
    }
  }, [setStoredState]);

  const handleTemplateSelectChange = React.useCallback(
    (nextTemplateId: string) => {
      if (nextTemplateId === TEMPLATE_IMPORT_ID) {
        handleImportTemplate();
        return;
      }

      if (nextTemplateId === TEMPLATE_CUSTOM_ID) return;

      const template = allTemplates.find(
        (candidate) => candidate.id === nextTemplateId,
      );
      if (!template) return;

      setStoredState(sanitizeTagDesignerState(template.layout));
      toast.success(`Applied template: ${template.name}.`);
    },
    [allTemplates, handleImportTemplate, setStoredState],
  );

  const handleSaveTemplate = React.useCallback(() => {
    const suggestedName =
      matchedTemplate && !matchedTemplate.isBuiltin ? matchedTemplate.name : "";
    const inputName = window.prompt(
      "Template name",
      suggestedName || "My template",
    );
    if (inputName === null) return;

    const name = inputName.trim();
    if (!name) {
      toast.error("Template name is required.");
      return;
    }

    const existingByName =
      userTemplates.find(
        (template) => template.name.toLowerCase() === name.toLowerCase(),
      ) ??
      (matchedTemplate && !matchedTemplate.isBuiltin ? matchedTemplate : null);
    const templateId =
      existingByName?.id ?? `user-template-${Date.now().toString(36)}`;
    const layout = sanitizeTagDesignerState(state);

    setStoredUserTemplates((previous) => {
      const sanitizedPrevious = (Array.isArray(previous) ? previous : [])
        .map((template) => sanitizeStoredTemplate(template))
        .filter(
          (template): template is StoredTagLayoutTemplate => template !== null,
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
  }, [matchedTemplate, setStoredUserTemplates, state, userTemplates]);

  const handleDeleteTemplate = React.useCallback(
    (templateId: string, templateName: string) => {
      const shouldDelete = window.confirm(`Delete template "${templateName}"?`);
      if (!shouldDelete) return;

      setStoredUserTemplates((previous) =>
        (Array.isArray(previous) ? previous : [])
          .map((template) => sanitizeStoredTemplate(template))
          .filter(
            (template): template is StoredTagLayoutTemplate =>
              template !== null && template.id !== templateId,
          ),
      );
      toast.success("Template deleted.");
    },
    [setStoredUserTemplates],
  );

  const handleTemplateRowDeleteClick = React.useCallback(
    (
      event: React.MouseEvent<HTMLButtonElement>,
      templateId: string,
      templateName: string,
    ) => {
      event.preventDefault();
      event.stopPropagation();
      handleDeleteTemplate(templateId, templateName);
    },
    [handleDeleteTemplate],
  );

  const handleTemplateRowDeleteMouseDown = React.useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
    },
    [],
  );

  const applyTemplateFromPicker = React.useCallback(
    (templateId: string) => {
      setIsTemplatePickerOpen(false);
      handleTemplateSelectChange(templateId);
    },
    [handleTemplateSelectChange],
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

  const updateRow = React.useCallback(
    (rowIndex: number, updater: (row: TagRow) => TagRow) => {
      updateState((prev) => ({
        ...prev,
        rows: prev.rows.map((row, index) =>
          index === rowIndex ? updater(row) : row,
        ),
      }));
    },
    [updateState],
  );

  const addRow = React.useCallback(() => {
    updateState((prev) => ({
      ...prev,
      rows: [
        ...prev.rows,
        { id: generateRowId(), cells: [createDefaultCell(prev.rows)] },
      ],
    }));
  }, [updateState]);

  const removeRow = React.useCallback(
    (index: number) => {
      updateState((prev) => ({
        ...prev,
        rows: prev.rows.filter((_, rowIndex) => rowIndex !== index),
      }));
    },
    [updateState],
  );

  const moveRow = React.useCallback(
    (index: number, direction: -1 | 1) => {
      updateState((prev) => {
        const nextIndex = index + direction;
        if (nextIndex < 0 || nextIndex >= prev.rows.length) return prev;
        const rows = [...prev.rows];
        const currentRow = rows[index]!;
        rows[index] = rows[nextIndex]!;
        rows[nextIndex] = currentRow;
        return { ...prev, rows };
      });
    },
    [updateState],
  );

  const addCellToRow = React.useCallback(
    (rowIndex: number) => {
      updateState((prev) => ({
        ...prev,
        rows: prev.rows.map((row, index) =>
          index === rowIndex
            ? { ...row, cells: [...row.cells, createDefaultCell(prev.rows)] }
            : row,
        ),
      }));
    },
    [updateState],
  );

  const moveCell = React.useCallback(
    (rowIndex: number, cellIndex: number, direction: -1 | 1) => {
      updateState((prev) => {
        const row = prev.rows[rowIndex];
        if (!row) return prev;
        const nextIndex = cellIndex + direction;
        if (nextIndex < 0 || nextIndex >= row.cells.length) return prev;
        const cells = [...row.cells];
        const currentCell = cells[cellIndex]!;
        cells[cellIndex] = cells[nextIndex]!;
        cells[nextIndex] = currentCell;
        return {
          ...prev,
          rows: prev.rows.map((candidateRow, index) =>
            index === rowIndex ? { ...candidateRow, cells } : candidateRow,
          ),
        };
      });
    },
    [updateState],
  );

  const updateRowCell = React.useCallback(
    (rowIndex: number, cellIndex: number, updatedCell: TagCell) => {
      updateRow(rowIndex, (row) => ({
        ...row,
        cells: row.cells.map((cell, index) =>
          index === cellIndex ? updatedCell : cell,
        ),
      }));
    },
    [updateRow],
  );

  const removeRowCell = React.useCallback(
    (rowIndex: number, cellIndex: number) => {
      updateRow(rowIndex, (row) => ({
        ...row,
        cells: row.cells.filter((_, index) => index !== cellIndex),
      }));
    },
    [updateRow],
  );

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
          Math.max(
            MIN_SHEET_COPIES_PER_LABEL,
            Math.floor(nextCopiesPerLabel),
          ),
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
      toast.error("Select at least one listing in the table before downloading.");
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
      toast.error("Select at least one listing in the table before downloading.");
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
      toast.error("Select at least one listing in the table before downloading.");
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
      toast.error("Select at least one listing in the table before downloading.");
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
      heightInches,
      state,
      templatePickerProps: {
        builtinTemplates,
        isOpen: isTemplatePickerOpen,
        onApplyTemplate: applyTemplateFromPicker,
        onDeleteTemplateClick: handleTemplateRowDeleteClick,
        onDeleteTemplateMouseDown: handleTemplateRowDeleteMouseDown,
        onOpenChange: setIsTemplatePickerOpen,
        selectedTemplateId,
        selectedTemplateLabel,
        userTemplates,
      },
      updateState,
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
    layoutProps: {
      isCustomLayout,
      matchedTemplateName,
      onAddCellToRow: addCellToRow,
      onAddRow: addRow,
      onMoveCell: moveCell,
      onMoveRow: moveRow,
      onRemoveRow: removeRow,
      onRemoveRowCell: removeRowCell,
      onResetLayout: resetLayout,
      onSaveTemplate: handleSaveTemplate,
      onShareTemplate: handleShareTemplate,
      onUpdateRowCell: updateRowCell,
      rows: state.rows,
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

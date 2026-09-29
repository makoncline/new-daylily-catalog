"use client";

import * as React from "react";
import {
  Copy,
  Pencil,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MAX_TAG_HEIGHT_INCHES,
  MAX_TAG_WIDTH_INCHES,
  MIN_TAG_HEIGHT_INCHES,
  MIN_TAG_WIDTH_INCHES,
  TAG_SIZE_PRESETS,
  TAG_TEMPLATE_FIELD_DEFINITIONS,
  buildTagTemplateAiInstructions,
  findUnknownTagTemplateFields,
  formatSheetNumberForInput,
  getTagTemplateValidationIssues,
  getTagTextTemplateFieldIds,
  normalizeSheetNumber,
  parseSheetNumberInput,
} from "./tag-designer-model";
import type {
  ResolvedTagLayoutTemplate,
  StoredTagLayoutTemplate,
  TagDesignerState,
  UpdateTagDesignerState,
} from "./tag-designer-model";

function CustomDimensionField({
  id,
  label,
  value,
  min,
  max,
  onCommit,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  onCommit: (value: number) => void;
}) {
  const [error, setError] = React.useState<string | null>(null);
  const formattedValue = formatSheetNumberForInput(value, 2);

  const commit = (input: HTMLInputElement) => {
    const parsed = parseSheetNumberInput(input.value.trim(), 2);
    if (parsed === null || parsed < min || parsed > max) {
      setError(
        `Enter a number from ${min.toFixed(2)} to ${max.toFixed(2)} inches.`,
      );
      return;
    }
    const normalized = normalizeSheetNumber(parsed, min, max, 2);
    onCommit(normalized);
    input.value = formatSheetNumberForInput(normalized, 2);
    setError(null);
  };

  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        key={`${id}-${value}`}
        id={id}
        type="number"
        min={min}
        max={max}
        step={0.01}
        inputMode="decimal"
        defaultValue={formattedValue}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={() => setError(null)}
        onBlur={(event) => commit(event.currentTarget)}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
          if (event.key === "Escape") {
            event.currentTarget.value = formattedValue;
            setError(null);
            event.currentTarget.blur();
          }
        }}
      />
      {error ? <FieldError id={`${id}-error`}>{error}</FieldError> : null}
    </Field>
  );
}

function TagDesignerCustomSizeInputs({
  customWidthInches,
  customHeightInches,
  updateState,
}: {
  customWidthInches: number;
  customHeightInches: number;
  updateState: UpdateTagDesignerState;
}) {
  return (
    <FieldGroup className="sm:flex-row">
      <CustomDimensionField
        id="custom-width-input"
        label="Width (in)"
        value={customWidthInches}
        min={MIN_TAG_WIDTH_INCHES}
        max={MAX_TAG_WIDTH_INCHES}
        onCommit={(customWidthInches) =>
          updateState((previous) => ({ ...previous, customWidthInches }))
        }
      />
      <CustomDimensionField
        id="custom-height-input"
        label="Height (in)"
        value={customHeightInches}
        min={MIN_TAG_HEIGHT_INCHES}
        max={MAX_TAG_HEIGHT_INCHES}
        onCommit={(customHeightInches) =>
          updateState((previous) => ({ ...previous, customHeightInches }))
        }
      />
    </FieldGroup>
  );
}

interface TagDesignerControlsProps {
  builtinTemplates: ResolvedTagLayoutTemplate[];
  customTemplateText: string;
  isCustomLayout: boolean;
  onApplyTemplate: (templateId: string) => void;
  onCustomTemplateChange: (template: string) => void;
  onDeleteTemplate: (templateId: string) => boolean;
  onResetLayout: () => void;
  onSaveTemplate: (name: string, sourceTemplateId?: string) => boolean;
  selectedTemplateId: string;
  state: TagDesignerState;
  updateState: UpdateTagDesignerState;
  userTemplates: StoredTagLayoutTemplate[];
  widthInches: number;
  heightInches: number;
}

const TEMPLATE_DESCRIPTIONS: Record<string, string> = {
  "template-simple-name": 'Cultivar name · recommended 1" tag',
  "default-template":
    'Two-line name, hybridizer/year, and ploidy · recommended 1"',
  "template-sale-tag": 'Name, identity, ploidy, and price · recommended 1"',
  "template-grower-details":
    'Identity and growing traits · recommended 2" × 4" card',
};

export function TagDesignerControls({
  builtinTemplates,
  customTemplateText,
  isCustomLayout,
  onApplyTemplate,
  onCustomTemplateChange,
  onDeleteTemplate,
  onResetLayout,
  onSaveTemplate,
  selectedTemplateId,
  state,
  updateState,
  userTemplates,
  widthInches,
  heightInches,
}: TagDesignerControlsProps) {
  const [isCustomEditorOpen, setIsCustomEditorOpen] =
    React.useState(isCustomLayout);
  const [isAiInstructionsOpen, setIsAiInstructionsOpen] = React.useState(false);
  const [templateName, setTemplateName] = React.useState("");
  const [customSourceTemplateId, setCustomSourceTemplateId] = React.useState<
    string | null
  >(isCustomLayout ? null : selectedTemplateId);
  const [customTemplateDraft, setCustomTemplateDraft] =
    React.useState(customTemplateText);
  const templateTextareaRef = React.useRef<HTMLTextAreaElement>(null);
  const unknownFields = findUnknownTagTemplateFields(customTemplateDraft);
  const validationIssues = getTagTemplateValidationIssues(customTemplateDraft);
  const usedFields = getTagTextTemplateFieldIds(customTemplateDraft);
  const includesPrivateNote = usedFields.includes("privateNote");
  const aiInstructions = buildTagTemplateAiInstructions(customTemplateDraft, {
    widthInches,
    heightInches,
    showQrCode: state.showQrCode,
  });
  const sourceUserTemplate = userTemplates.find(
    (template) => template.id === customSourceTemplateId,
  );

  React.useEffect(() => {
    if (isCustomLayout) setIsCustomEditorOpen(true);
  }, [isCustomLayout]);

  React.useEffect(() => {
    if (!isCustomEditorOpen) setCustomTemplateDraft(customTemplateText);
  }, [customTemplateText, isCustomEditorOpen]);

  const changeCustomTemplate = (template: string) => {
    setCustomTemplateDraft(template);
    onCustomTemplateChange(template);
  };

  const applyTemplate = (templateId: string) => {
    onApplyTemplate(templateId);
    setIsCustomEditorOpen(false);
    setCustomSourceTemplateId(templateId);
    setTemplateName("");
  };

  const copyAiInstructions = async () => {
    try {
      await navigator.clipboard.writeText(aiInstructions);
      toast.success(
        "AI prompt copied. Describe the tag you want, then paste back only the returned template.",
      );
    } catch {
      window.prompt("Copy AI instructions", aiInstructions);
    }
  };

  const beginCustomization = () => {
    setCustomSourceTemplateId(isCustomLayout ? null : selectedTemplateId);
    setCustomTemplateDraft(customTemplateText);
    const selectedUserTemplate = userTemplates.find(
      (template) => template.id === selectedTemplateId,
    );
    setTemplateName(selectedUserTemplate?.name ?? "");
    setIsCustomEditorOpen(true);
  };

  const discardCustomChanges = () => {
    if (customSourceTemplateId) {
      applyTemplate(customSourceTemplateId);
      return;
    }
    onResetLayout();
    setIsCustomEditorOpen(false);
  };

  const insertField = (fieldId: string) => {
    const textarea = templateTextareaRef.current;
    const token = `{{${fieldId}}}`;
    if (!textarea) {
      changeCustomTemplate(`${customTemplateDraft}${token}`);
      return;
    }

    const selectionStart = textarea.selectionStart;
    const selectionEnd = textarea.selectionEnd;
    const nextTemplate = `${customTemplateDraft.slice(
      0,
      selectionStart,
    )}${token}${customTemplateDraft.slice(selectionEnd)}`;
    changeCustomTemplate(nextTemplate);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(
        selectionStart + token.length,
        selectionStart + token.length,
      );
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <FieldGroup className="sm:flex-row sm:items-end">
        <Field className="min-w-0 flex-1">
          <FieldLabel htmlFor="tag-size-select">Tag Size</FieldLabel>
          <Select
            value={state.sizePresetId}
            onValueChange={(sizePresetId) =>
              updateState((previous) => ({ ...previous, sizePresetId }))
            }
          >
            <SelectTrigger id="tag-size-select" aria-label="Tag Size">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {TAG_SIZE_PRESETS.map((preset) => (
                  <SelectItem key={preset.id} value={preset.id}>
                    {preset.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <Field orientation="horizontal" className="sm:w-auto">
          <Switch
            id="layout-qr-toggle"
            checked={state.showQrCode}
            onCheckedChange={(showQrCode) =>
              updateState((previous) => ({ ...previous, showQrCode }))
            }
          />
          <FieldLabel htmlFor="layout-qr-toggle">Include QR code</FieldLabel>
        </Field>
      </FieldGroup>

      {state.sizePresetId === "custom" ? (
        <div className="max-w-md">
          <TagDesignerCustomSizeInputs
            customWidthInches={state.customWidthInches}
            customHeightInches={state.customHeightInches}
            updateState={updateState}
          />
        </div>
      ) : null}

      <FieldSet>
        <FieldLegend>Choose a template</FieldLegend>
        <FieldDescription>
          Start with a common tag. You can customize it if you need more.
        </FieldDescription>

        <RadioGroup
          aria-label="Choose a template"
          value={isCustomEditorOpen ? "" : selectedTemplateId}
          onValueChange={applyTemplate}
          className="sm:grid-cols-2"
        >
          {builtinTemplates.map((template) => {
            return (
              <FieldLabel key={template.id} htmlFor={template.id}>
                <Field orientation="horizontal">
                  <RadioGroupItem id={template.id} value={template.id} />
                  <FieldContent>
                    <FieldTitle>{template.name}</FieldTitle>
                    <FieldDescription>
                      {TEMPLATE_DESCRIPTIONS[template.id]}
                    </FieldDescription>
                  </FieldContent>
                </Field>
              </FieldLabel>
            );
          })}
          {userTemplates.map((template) => (
            <div key={template.id} className="flex min-w-0 items-center gap-2">
              <FieldLabel htmlFor={template.id} className="min-w-0 flex-1">
                <Field orientation="horizontal">
                  <RadioGroupItem id={template.id} value={template.id} />
                  <FieldContent className="min-w-0">
                    <FieldTitle>{template.name}</FieldTitle>
                    <FieldDescription>Saved in this browser</FieldDescription>
                  </FieldContent>
                </Field>
              </FieldLabel>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete template ${template.name}`}
                  >
                    <Trash2 />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete {template.name}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This removes the saved template from this browser.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction asChild>
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => {
                          const didDelete = onDeleteTemplate(template.id);
                          if (
                            didDelete &&
                            customSourceTemplateId === template.id
                          ) {
                            setCustomSourceTemplateId(null);
                          }
                        }}
                      >
                        Delete template
                      </Button>
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ))}
        </RadioGroup>

        {!isCustomEditorOpen ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="self-start"
            onClick={beginCustomization}
          >
            <Pencil data-icon="inline-start" />
            Customize this template
          </Button>
        ) : (
          <FieldGroup>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <FieldTitle>Customize layout</FieldTitle>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={discardCustomChanges}
                >
                  <RotateCcw data-icon="inline-start" />
                  Discard changes
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAiInstructionsOpen(true)}
                >
                  <Sparkles data-icon="inline-start" />
                  Get AI instructions
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline" size="sm">
                    <Plus data-icon="inline-start" />
                    Insert field
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="max-h-72 w-64 overflow-y-auto"
                >
                  <DropdownMenuGroup>
                    {TAG_TEMPLATE_FIELD_DEFINITIONS.map((field) => (
                      <DropdownMenuItem
                        key={field.id}
                        onSelect={() => insertField(field.id)}
                      >
                        <span className="flex-1">{field.label}</span>
                        <code className="text-muted-foreground text-xs">
                          {`{{${field.id}}}`}
                        </code>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
              <span className="text-muted-foreground text-xs">
                Up to two columns per row
              </span>
            </div>

            <Field
              data-invalid={
                unknownFields.length > 0 || validationIssues.length > 0
              }
            >
              <FieldLabel htmlFor="custom-tag-template">
                Custom template
              </FieldLabel>
              <FieldDescription>
                One row per line. Use <code>{"{{fieldName}}"}</code> for listing
                data.
                <code> #</code> makes a title, <code>##</code> makes bold text,
                <code> -</code> makes small text, and <code> |</code> makes two
                columns. A blank line adds space.
              </FieldDescription>
              <Textarea
                ref={templateTextareaRef}
                id="custom-tag-template"
                value={customTemplateDraft}
                onChange={(event) => changeCustomTemplate(event.target.value)}
                className="min-h-28 resize-y"
                aria-invalid={
                  unknownFields.length > 0 || validationIssues.length > 0
                }
                spellCheck={false}
              />
              {unknownFields.length > 0 ? (
                <FieldError>
                  {unknownFields.map((field) => `{{${field}}}`).join(", ")}{" "}
                  {unknownFields.length === 1 ? "is" : "are"} not an available
                  field. Choose a field from Insert field.
                </FieldError>
              ) : null}
              {validationIssues.map((issue) => (
                <FieldError key={issue}>{issue}</FieldError>
              ))}
            </Field>

            {includesPrivateNote ? (
              <Alert>
                <TriangleAlert />
                <AlertDescription>
                  Private notes will be printed on the tag.
                </AlertDescription>
              </Alert>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <Field className="sm:max-w-xs">
                <FieldLabel htmlFor="template-name">Template name</FieldLabel>
                <Input
                  id="template-name"
                  value={templateName}
                  onChange={(event) => setTemplateName(event.target.value)}
                  placeholder="Name this layout"
                />
              </Field>
              <Button
                type="button"
                variant="outline"
                disabled={
                  templateName.trim().length === 0 ||
                  unknownFields.length > 0 ||
                  validationIssues.length > 0
                }
                onClick={() => {
                  if (onSaveTemplate(templateName, sourceUserTemplate?.id)) {
                    setTemplateName("");
                    setIsCustomEditorOpen(false);
                  }
                }}
              >
                {sourceUserTemplate ? "Save changes" : "Save as template"}
              </Button>
            </div>
            <FieldDescription>
              Saved templates stay in this browser.
            </FieldDescription>
          </FieldGroup>
        )}
      </FieldSet>

      <Dialog
        open={isAiInstructionsOpen}
        onOpenChange={setIsAiInstructionsOpen}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Make a tag template with AI</DialogTitle>
            <DialogDescription>
              Copy this prompt into ChatGPT or another assistant, describe the
              tag you want, then paste only the template it returns into the
              editor.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            aria-label="AI template instructions"
            readOnly
            value={aiInstructions}
            className="min-h-80 resize-none"
          />
          <div className="text-muted-foreground text-xs">
            {TAG_TEMPLATE_FIELD_DEFINITIONS.length} fields included.
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                void copyAiInstructions();
              }}
            >
              <Copy data-icon="inline-start" />
              Copy instructions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

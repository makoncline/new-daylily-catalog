"use client";

import * as React from "react";
import { Pencil, Plus, RotateCcw, Trash2, TriangleAlert } from "lucide-react";
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
  TAG_TEMPLATE_FIELD_DEFINITIONS,
  buildTagTemplateAiInstructions,
  findUnknownTagTemplateFields,
  getTagTemplateValidationIssues,
  getTagTextTemplateFieldIds,
} from "./tag-designer-model";
import type {
  ResolvedTagLayoutTemplate,
  StoredTagLayoutTemplate,
} from "./tag-designer-model";
import { TagTemplateAiDialog } from "./tag-template-ai-dialog";

interface TagTemplateEditorProps {
  builtinTemplates: ResolvedTagLayoutTemplate[];
  customTemplateText: string;
  isCustomLayout: boolean;
  onApplyTemplate: (templateId: string) => void;
  onCustomTemplateChange: (template: string) => void;
  onDeleteTemplate: (templateId: string) => boolean;
  onResetLayout: () => void;
  onSaveTemplate: (name: string, sourceTemplateId?: string) => boolean;
  selectedTemplateId: string;
  showQrCode: boolean;
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

export function TagTemplateEditor({
  builtinTemplates,
  customTemplateText,
  isCustomLayout,
  onApplyTemplate,
  onCustomTemplateChange,
  onDeleteTemplate,
  onResetLayout,
  onSaveTemplate,
  selectedTemplateId,
  showQrCode,
  userTemplates,
  widthInches,
  heightInches,
}: TagTemplateEditorProps) {
  const [isCustomEditorOpen, setIsCustomEditorOpen] =
    React.useState(isCustomLayout);
  const [focusAfterDelete, setFocusAfterDelete] = React.useState(false);
  const [templateName, setTemplateName] = React.useState("");
  const [customSourceTemplateId, setCustomSourceTemplateId] = React.useState<
    string | null
  >(isCustomLayout ? null : selectedTemplateId);
  const [customTemplateDraft, setCustomTemplateDraft] =
    React.useState(customTemplateText);
  const templateTextareaRef = React.useRef<HTMLTextAreaElement>(null);
  const templateChoicesRef = React.useRef<HTMLDivElement>(null);
  const insertedFieldCaretRef = React.useRef<number | null>(null);
  const editorId = React.useId();
  const unknownFields = findUnknownTagTemplateFields(customTemplateDraft);
  const validationIssues = getTagTemplateValidationIssues(customTemplateDraft);
  const usedFields = getTagTextTemplateFieldIds(customTemplateDraft);
  const includesPrivateNote = usedFields.includes("privateNote");
  const aiInstructions = buildTagTemplateAiInstructions(customTemplateDraft, {
    widthInches,
    heightInches,
    showQrCode,
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

  React.useEffect(() => {
    if (!focusAfterDelete) return;
    const target = isCustomEditorOpen
      ? templateTextareaRef.current
      : templateChoicesRef.current?.querySelector<HTMLElement>(
          '[role="radio"][aria-checked="true"]',
        );
    if (!target) return;
    target.focus();
    setFocusAfterDelete(false);
  }, [focusAfterDelete, isCustomEditorOpen, userTemplates]);

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
    insertedFieldCaretRef.current = selectionStart + token.length;
  };

  return (
    <>
      <FieldSet>
        <FieldLegend>Choose a template</FieldLegend>
        <FieldDescription>
          Start with a common tag. You can customize it if you need more.
        </FieldDescription>

        <RadioGroup
          ref={templateChoicesRef}
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
                    <AlertDialogAction
                      variant="destructive"
                      onClick={() => {
                        const didDelete = onDeleteTemplate(template.id);
                        if (didDelete) setFocusAfterDelete(true);
                        if (
                          didDelete &&
                          customSourceTemplateId === template.id
                        ) {
                          setCustomSourceTemplateId(null);
                        }
                      }}
                    >
                      Delete template
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
                <TagTemplateAiDialog instructions={aiInstructions} />
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
                  onCloseAutoFocus={(event) => {
                    const caret = insertedFieldCaretRef.current;
                    if (caret === null) return;
                    event.preventDefault();
                    templateTextareaRef.current?.focus();
                    templateTextareaRef.current?.setSelectionRange(
                      caret,
                      caret,
                    );
                    insertedFieldCaretRef.current = null;
                  }}
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
              <FieldLabel htmlFor={editorId}>Custom template</FieldLabel>
              <FieldDescription id={`${editorId}-instructions`}>
                One row per line. Use <code>{"{{fieldName}}"}</code> for listing
                data.
                <code> #</code> makes a title, <code>##</code> makes bold text,
                <code> -</code> makes small text, and <code> |</code> makes two
                columns. A blank line adds space.
              </FieldDescription>
              <Textarea
                ref={templateTextareaRef}
                id={editorId}
                value={customTemplateDraft}
                onChange={(event) => changeCustomTemplate(event.target.value)}
                className="min-h-28 resize-y"
                aria-invalid={
                  unknownFields.length > 0 || validationIssues.length > 0
                }
                aria-describedby={[
                  `${editorId}-instructions`,
                  ...(unknownFields.length > 0
                    ? [`${editorId}-unknown-fields`]
                    : []),
                  ...validationIssues.map(
                    (_, index) => `${editorId}-validation-${index}`,
                  ),
                ].join(" ")}
                spellCheck={false}
              />
              {unknownFields.length > 0 ? (
                <FieldError id={`${editorId}-unknown-fields`}>
                  {unknownFields.map((field) => `{{${field}}}`).join(", ")}{" "}
                  {unknownFields.length === 1 ? "is" : "are"} not an available
                  field. Choose a field from Insert field.
                </FieldError>
              ) : null}
              {validationIssues.map((issue, index) => (
                <FieldError key={issue} id={`${editorId}-validation-${index}`}>
                  {issue}
                </FieldError>
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
    </>
  );
}

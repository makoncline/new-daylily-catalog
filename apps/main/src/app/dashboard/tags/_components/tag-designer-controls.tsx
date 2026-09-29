"use client";

import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  MAX_TAG_HEIGHT_INCHES,
  MAX_TAG_WIDTH_INCHES,
  MIN_TAG_HEIGHT_INCHES,
  MIN_TAG_WIDTH_INCHES,
  TAG_SIZE_PRESETS,
} from "./tag-designer-model";
import type {
  ResolvedTagLayoutTemplate,
  StoredTagLayoutTemplate,
  TagDesignerState,
  UpdateTagDesignerState,
} from "./tag-designer-model";
import { TagNumberField } from "./tag-number-field";
import { TagTemplateEditor } from "./tag-template-editor";

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
      <TagNumberField
        id="custom-width-input"
        label="Width (in)"
        value={customWidthInches}
        min={MIN_TAG_WIDTH_INCHES}
        max={MAX_TAG_WIDTH_INCHES}
        step={0.01}
        decimals={2}
        invalidMessage={`Enter a number from ${MIN_TAG_WIDTH_INCHES.toFixed(2)} to ${MAX_TAG_WIDTH_INCHES.toFixed(2)} inches.`}
        onCommit={(customWidthInches) =>
          updateState((previous) => ({ ...previous, customWidthInches }))
        }
      />
      <TagNumberField
        id="custom-height-input"
        label="Height (in)"
        value={customHeightInches}
        min={MIN_TAG_HEIGHT_INCHES}
        max={MAX_TAG_HEIGHT_INCHES}
        step={0.01}
        decimals={2}
        invalidMessage={`Enter a number from ${MIN_TAG_HEIGHT_INCHES.toFixed(2)} to ${MAX_TAG_HEIGHT_INCHES.toFixed(2)} inches.`}
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

export function TagDesignerControls({
  state,
  updateState,
  ...templateProps
}: TagDesignerControlsProps) {
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

      <TagTemplateEditor {...templateProps} showQrCode={state.showQrCode} />
    </div>
  );
}

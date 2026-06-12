"use client";

import { ArrowDown, ArrowUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ALL_FIELD_IDS,
  FIELD_DEFAULTS,
  FIELD_DISPLAY_NAMES,
  clamp,
} from "./tag-designer-model";
import type { TagCell, TagFieldId, TagTextAlign } from "./tag-designer-model";

export const CELL_GRID =
  "grid grid-cols-[3rem_7rem_5rem_2.5rem_3rem_3rem_8rem_max-content_1.5rem] items-center justify-items-start gap-x-1.5";

interface TagCellEditorProps {
  cell: TagCell;
  isFirst: boolean;
  isLast: boolean;
  onUpdate: (cell: TagCell) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

export function TagCellEditor({
  cell,
  isFirst,
  isLast,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
}: TagCellEditorProps) {
  const patch = (partial: Partial<TagCell>) =>
    onUpdate({ ...cell, ...partial });

  const commitWidthDraft = (inputElement: HTMLInputElement) => {
    const parsedWidth = Number.parseInt(inputElement.value.trim(), 10);
    const nextWidth = Number.isFinite(parsedWidth)
      ? clamp(parsedWidth, 1, 12)
      : cell.width;
    patch({ width: nextWidth });
    inputElement.value = String(nextWidth);
  };

  const commitFontSizeDraft = (inputElement: HTMLInputElement) => {
    const parsedFontSize = Number.parseInt(inputElement.value.trim(), 10);
    const nextFontSize = Number.isFinite(parsedFontSize)
      ? clamp(parsedFontSize, 6, 28)
      : cell.fontSize;
    patch({ fontSize: nextFontSize });
    inputElement.value = String(nextFontSize);
  };

  return (
    <div className={CELL_GRID}>
      <div className="flex items-center gap-0.5">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="size-6 px-0"
          disabled={isFirst}
          onClick={onMoveUp}
          title="Move cell left"
        >
          <ArrowUp className="size-3" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="size-6 px-0"
          disabled={isLast}
          onClick={onMoveDown}
          title="Move cell right"
        >
          <ArrowDown className="size-3" />
        </Button>
      </div>

      <select
        className="border-border bg-background h-7 w-full rounded border px-1 text-xs"
        value={cell.fieldId}
        onChange={(e) => {
          const newId = e.target.value as TagFieldId;
          const defaults = FIELD_DEFAULTS[newId];
          onUpdate({
            ...cell,
            fieldId: newId,
            label: defaults.label,
            bold: defaults.bold,
            fontSize: defaults.fontSize,
          });
        }}
      >
        {ALL_FIELD_IDS.map((id) => (
          <option key={id} value={id}>
            {FIELD_DISPLAY_NAMES[id]}
          </option>
        ))}
      </select>

      <Input
        value={cell.label}
        onChange={(e) => patch({ label: e.target.value })}
        placeholder={cell.fieldId === "customText" ? "Text" : "Label"}
        className="h-7 px-1 text-xs"
        title={
          cell.fieldId === "customText"
            ? "Static text (leave empty for blank cell)"
            : "Label prefix (leave empty for no label)"
        }
      />

      <Input
        key={`cell-width-${cell.fieldId}-${cell.width}`}
        type="number"
        inputMode="numeric"
        min={1}
        max={12}
        step={1}
        defaultValue={cell.width}
        onBlur={(event) => commitWidthDraft(event.currentTarget)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          }
        }}
        className="h-7 px-1 text-center text-xs"
        title="Column width (fr units)"
      />

      <select
        className="border-border bg-background h-7 w-full rounded border px-0.5 text-xs"
        value={cell.textAlign}
        onChange={(e) => patch({ textAlign: e.target.value as TagTextAlign })}
        title="Text alignment"
      >
        <option value="left">L</option>
        <option value="center">C</option>
        <option value="right">R</option>
      </select>

      <Input
        key={`cell-font-${cell.fieldId}-${cell.fontSize}`}
        type="number"
        inputMode="numeric"
        min={6}
        max={28}
        step={1}
        defaultValue={cell.fontSize}
        onBlur={(event) => commitFontSizeDraft(event.currentTarget)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          }
        }}
        className="h-7 px-1 text-center text-xs"
        title="Font size (px)"
      />

      <div className="flex items-center gap-2 text-[10px] leading-none">
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={cell.overflow}
            onChange={(e) =>
              patch(
                e.target.checked
                  ? { overflow: true, fit: false, wrap: false }
                  : { overflow: false },
              )
            }
            className="size-3"
          />
          Ov
        </label>
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={cell.fit}
            onChange={(e) =>
              patch(
                e.target.checked
                  ? { overflow: false, fit: true, wrap: false }
                  : { fit: false },
              )
            }
            className="size-3"
          />
          Fit
        </label>
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={cell.wrap}
            onChange={(e) =>
              patch(
                e.target.checked
                  ? { overflow: false, fit: false, wrap: true }
                  : { wrap: false },
              )
            }
            className="size-3"
          />
          Wrap
        </label>
      </div>

      <div className="flex items-center gap-0.5">
        <Button
          type="button"
          variant={cell.bold ? "default" : "outline"}
          size="sm"
          className="size-6 px-0 text-xs"
          onClick={() => patch({ bold: !cell.bold })}
          title="Bold"
        >
          B
        </Button>
        <Button
          type="button"
          variant={cell.italic ? "default" : "outline"}
          size="sm"
          className="size-6 px-0 text-xs italic"
          onClick={() => patch({ italic: !cell.italic })}
          title="Italic"
        >
          I
        </Button>
        <Button
          type="button"
          variant={cell.underline ? "default" : "outline"}
          size="sm"
          className="size-6 px-0 text-xs underline"
          onClick={() => patch({ underline: !cell.underline })}
          title="Underline"
        >
          U
        </Button>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="size-6 px-0"
        onClick={onRemove}
        title="Remove cell"
      >
        <X className="size-3" />
      </Button>
    </div>
  );
}

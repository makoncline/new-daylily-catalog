"use client";

import { useId, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn, formatPrice } from "@/lib/utils";
import { listingFormSchema } from "@/types/schemas/listing";

export interface CatalogInlineFieldProps {
  value: string;
  label: string;
  field: "title" | "price" | "description" | "privateNote";
  onSave: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export function CatalogInlineField({
  value,
  label,
  field,
  onSave,
  disabled = false,
  className,
}: CatalogInlineFieldProps) {
  const numeric = field === "price";
  const multiline = field === "description" || field === "privateNote";
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const cancelRef = useRef(false);
  const restoreFocusRef = useRef(false);
  const errorId = useId();
  const width = multiline ? "w-60" : numeric ? "w-24" : "w-48";

  function commit(restoreFocus = false) {
    if (cancelRef.current) return;
    const next = field === "title" ? draft.trim() : draft;
    const candidate = numeric ? (next.trim() ? Number(next) : null) : next;
    const schema =
      field === "title"
        ? listingFormSchema.shape.title.unwrap().max(200)
        : multiline
          ? listingFormSchema.shape.description.unwrap().unwrap().max(10_000)
          : listingFormSchema.shape.price;
    const parsed = schema.safeParse(candidate);
    if (!parsed.success) {
      setError(
        numeric
          ? Number.isFinite(candidate)
            ? "Use 0 or more."
            : "Enter a number."
          : (parsed.error.issues[0]?.message ?? "Check this value."),
      );
      return;
    }
    setError(null);
    restoreFocusRef.current = restoreFocus;
    setEditing(false);
    if (next !== value) onSave(next);
  }

  if (!editing) {
    return (
      <button
        type="button"
        ref={(node) => {
          if (node && restoreFocusRef.current) {
            node.focus();
            restoreFocusRef.current = false;
          }
        }}
        aria-label={label}
        disabled={disabled}
        onClick={() => {
          cancelRef.current = false;
          setDraft(value);
          setError(null);
          setEditing(true);
        }}
        title={value || label}
        className={cn(
          "hover:bg-accent focus-visible:ring-ring min-h-10 cursor-text rounded-sm px-2 py-1.5 text-left text-sm leading-5 transition-colors outline-none focus-visible:ring-1 disabled:cursor-default disabled:opacity-50",
          width,
          numeric && "text-right tabular-nums",
          !multiline && !numeric && "font-medium",
          className,
        )}
      >
        <span
          className={cn(
            "break-words",
            multiline ? "line-clamp-2 whitespace-pre-wrap" : "block truncate",
          )}
        >
          {(value && numeric ? formatPrice(Number(value)) : value) || (
            <span className="text-muted-foreground">—</span>
          )}
        </span>
      </button>
    );
  }

  const props = {
    "aria-label": label,
    "aria-invalid": Boolean(error),
    "aria-describedby": error ? errorId : undefined,
    value: draft,
    autoFocus: true,
    disabled,
    onFocus: (
      event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => event.currentTarget.select(),
    onChange: (
      event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => {
      setDraft(event.target.value);
      setError(null);
    },
    onBlur: () => commit(),
    onKeyDown: (event: React.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        cancelRef.current = true;
        restoreFocusRef.current = true;
        setEditing(false);
      } else if (
        event.key === "Enter" &&
        (!multiline || event.metaKey || event.ctrlKey)
      ) {
        event.preventDefault();
        commit(true);
      }
    },
  };

  return (
    <div className={cn("flex flex-col gap-0.5", width, className)}>
      {multiline ? (
        <Textarea {...props} rows={2} variant="inline" />
      ) : (
        <Input
          {...props}
          variant="inline"
          type={numeric ? "number" : "text"}
          inputMode={numeric ? "decimal" : undefined}
          min={numeric ? 0 : undefined}
          step={numeric ? "any" : undefined}
        />
      )}
      {error ? (
        <span
          id={errorId}
          role="alert"
          className="text-destructive px-2 text-xs leading-4"
        >
          {error}
        </span>
      ) : null}
    </div>
  );
}

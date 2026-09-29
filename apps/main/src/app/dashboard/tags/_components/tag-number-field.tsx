"use client";

import * as React from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  formatSheetNumberForInput,
  normalizeSheetNumber,
  parseSheetNumberInput,
} from "./tag-designer-model";

interface TagNumberFieldProps {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  decimals: number;
  showSteppers?: boolean;
  invalidMessage?: string;
  onCommit: (value: number) => void;
}

export function TagNumberField({
  id,
  label,
  value,
  min,
  max,
  step,
  decimals,
  showSteppers = false,
  invalidMessage,
  onCommit,
}: TagNumberFieldProps) {
  const formattedValue = formatSheetNumberForInput(value, decimals);
  const [draft, setDraft] = React.useState(formattedValue);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setDraft(formattedValue);
    setError(null);
  }, [formattedValue]);

  const commit = (input: HTMLInputElement) => {
    const parsed = parseSheetNumberInput(input.value.trim(), decimals);
    if (parsed === null || parsed < min || parsed > max) {
      setError(
        invalidMessage ??
          `Enter a ${decimals === 0 ? "whole number" : "number"} between ${formatSheetNumberForInput(min, decimals)} and ${formatSheetNumberForInput(max, decimals)}. Type a value and leave the field.`,
      );
      return;
    }
    const nextValue = normalizeSheetNumber(parsed, min, max, decimals);
    onCommit(nextValue);
    setDraft(formatSheetNumberForInput(nextValue, decimals));
    setError(null);
  };

  const stepValue = (direction: -1 | 1) => {
    const parsedDraft = parseSheetNumberInput(
      inputRef.current?.value.trim() ?? "",
      decimals,
    );
    const stepFrom =
      parsedDraft !== null && parsedDraft >= min && parsedDraft <= max
        ? normalizeSheetNumber(parsedDraft, min, max, decimals)
        : value;
    const nextValue = normalizeSheetNumber(
      stepFrom + step * direction,
      min,
      max,
      decimals,
    );
    onCommit(nextValue);
    const nextDraft = formatSheetNumberForInput(nextValue, decimals);
    if (inputRef.current) inputRef.current.value = nextDraft;
    setDraft(nextDraft);
    setError(null);
  };

  const input = (
    <Input
      ref={inputRef}
      id={id}
      type="number"
      min={min}
      max={max}
      step={step}
      inputMode={decimals === 0 ? "numeric" : "decimal"}
      value={draft}
      aria-invalid={Boolean(error)}
      aria-describedby={error ? `${id}-error` : undefined}
      onChange={(event) => {
        setDraft(event.target.value);
        setError(null);
      }}
      onBlur={(event) => commit(event.currentTarget)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.blur();
        }
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          event.currentTarget.value = formattedValue;
          setDraft(formattedValue);
          setError(null);
          event.currentTarget.blur();
        }
      }}
    />
  );

  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {showSteppers ? (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0"
            aria-label={`Decrease ${label}`}
            onPointerDown={(event) => {
              // Keep blur validation from moving the button before click.
              if (event.button === 0) event.preventDefault();
            }}
            onClick={(event) => {
              stepValue(-1);
              event.currentTarget.focus();
            }}
          >
            <Minus />
          </Button>
          {input}
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0"
            aria-label={`Increase ${label}`}
            onPointerDown={(event) => {
              if (event.button === 0) event.preventDefault();
            }}
            onClick={(event) => {
              stepValue(1);
              event.currentTarget.focus();
            }}
          >
            <Plus />
          </Button>
        </div>
      ) : (
        input
      )}
      {error ? <FieldError id={`${id}-error`}>{error}</FieldError> : null}
    </Field>
  );
}

"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface CurrencyInputProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "onChange" | "value"
  > {
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  onValueBlur?: (value: number | null) => void;
  currency?: string;
  className?: string;
}

/**
 * Simple currency input that handles formatting and only accepts whole numbers
 */
export const CurrencyInput = (
  {
    ref,
    value,
    onChange,
    onValueBlur,
    currency = "$",
    className,
    ...props
  }: CurrencyInputProps & {
    ref: React.RefObject<HTMLInputElement>;
  }
) => {
  // Handle display formatting
  const displayValue = value ? value.toString() : "";

  // Clean and parse input
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleanValue = e.target.value.replace(/\D/g, "");
    const numValue = cleanValue ? parseInt(cleanValue, 10) : null;
    onChange(numValue);
  };

  // Format on blur and trigger save if needed
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (value !== null && value !== undefined) {
      e.target.value = value.toLocaleString();
    }

    if (onValueBlur) {
      onValueBlur(value ?? null);
    }
  };

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
        {currency}
      </span>
      <Input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        className={cn("pl-7", className)}
        ref={ref}
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        {...props}
      />
    </div>
  );
};

CurrencyInput.displayName = "CurrencyInput";

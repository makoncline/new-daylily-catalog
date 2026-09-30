"use client";

import type { ComponentProps } from "react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";

interface CurrencyInputProps
  extends Omit<ComponentProps<"input">, "onChange" | "value"> {
  value: number | null | undefined;
  onChange: (value: number | null) => void;
}

export function CurrencyInput({
  value,
  onChange,
  ...props
}: CurrencyInputProps) {
  return (
    <InputGroup data-disabled={props.disabled}>
      <InputGroupAddon aria-hidden="true">$</InputGroupAddon>
      <InputGroupInput
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={value == null ? "" : String(value)}
        onChange={(event) => {
          const digits = event.target.value.replace(/\D/g, "");
          onChange(digits ? Number.parseInt(digits, 10) : null);
        }}
        {...props}
      />
    </InputGroup>
  );
}

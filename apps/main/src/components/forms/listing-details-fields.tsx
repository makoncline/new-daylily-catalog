"use client";

import type { ReactNode } from "react";
import { Controller, type UseFormReturn } from "react-hook-form";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CurrencyInput } from "@/components/currency-input";
import { useAutoResizeTextArea } from "@/hooks/use-auto-resize-textarea";
import { type ListingFormData } from "@/types/schemas/listing";
import { STATUS } from "@/config/constants";

type ListingFieldsProps = {
  form: UseFormReturn<ListingFormData>;
  disabled: boolean;
  help?: ReactNode;
};

export function ListingNameField({
  form,
  disabled,
  help = "Required. This is the name of your listing.",
}: ListingFieldsProps) {
  return (
    <Controller
      control={form.control}
      name="title"
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid} data-disabled={disabled}>
          <FieldLabel htmlFor="listing-name">Name</FieldLabel>
          <Input
            {...field}
            id="listing-name"
            value={field.value ?? ""}
            disabled={disabled}
            aria-invalid={fieldState.invalid}
            aria-describedby={
              fieldState.invalid
                ? "listing-name-description listing-name-error"
                : help
                  ? "listing-name-description"
                  : undefined
            }
          />
          {help ? (
            <FieldDescription id="listing-name-description">
              {help}
            </FieldDescription>
          ) : null}
          <FieldError id="listing-name-error" errors={[fieldState.error]} />
        </Field>
      )}
    />
  );
}

export function ListingDescriptionField({
  form,
  disabled,
  help = "Optional. This description is visible to everyone.",
}: ListingFieldsProps) {
  const { textAreaRef, adjustHeight } = useAutoResizeTextArea();
  return (
    <Controller
      control={form.control}
      name="description"
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid} data-disabled={disabled}>
          <FieldLabel htmlFor="listing-description">Description</FieldLabel>
          <Textarea
            {...field}
            ref={(element) => {
              field.ref(element);
              textAreaRef.current = element;
            }}
            id="listing-description"
            rows={4}
            value={field.value ?? ""}
            onChange={(event) => {
              field.onChange(event);
              adjustHeight();
            }}
            disabled={disabled}
            aria-invalid={fieldState.invalid}
            aria-describedby={
              fieldState.invalid
                ? "listing-description-help listing-description-error"
                : help
                  ? "listing-description-help"
                  : undefined
            }
          />
          {help ? (
            <FieldDescription id="listing-description-help">
              {help}
            </FieldDescription>
          ) : null}
          <FieldError
            id="listing-description-error"
            errors={[fieldState.error]}
          />
        </Field>
      )}
    />
  );
}

export function ListingPriceField({
  form,
  disabled,
  help = "Optional. Price in whole dollars (no cents).",
}: ListingFieldsProps) {
  return (
    <Controller
      control={form.control}
      name="price"
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid} data-disabled={disabled}>
          <FieldLabel htmlFor="listing-price">Price</FieldLabel>
          <CurrencyInput
            {...field}
            id="listing-price"
            disabled={disabled}
            aria-invalid={fieldState.invalid}
            aria-describedby={
              fieldState.invalid
                ? "listing-price-help listing-price-error"
                : help
                  ? "listing-price-help"
                  : undefined
            }
          />
          {help ? (
            <FieldDescription id="listing-price-help">{help}</FieldDescription>
          ) : null}
          <FieldError id="listing-price-error" errors={[fieldState.error]} />
        </Field>
      )}
    />
  );
}

export function ListingStatusField({
  form,
  disabled,
  help = "Hidden listings are not visible to the public.",
}: ListingFieldsProps) {
  return (
    <Controller
      control={form.control}
      name="status"
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid} data-disabled={disabled}>
          <FieldLabel htmlFor="listing-status">Status</FieldLabel>
          <Select
            onValueChange={(value) =>
              field.onChange(
                value === "published" ? STATUS.PUBLISHED : STATUS.HIDDEN,
              )
            }
            value={field.value === STATUS.HIDDEN ? STATUS.HIDDEN : "published"}
            disabled={disabled}
          >
            <SelectTrigger
              ref={field.ref}
              onBlur={field.onBlur}
              id="listing-status"
              aria-invalid={fieldState.invalid}
              aria-describedby={
                fieldState.invalid
                  ? "listing-status-help listing-status-error"
                  : help
                    ? "listing-status-help"
                    : undefined
              }
            >
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value={STATUS.HIDDEN}>Hidden</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
          {help ? (
            <FieldDescription id="listing-status-help">{help}</FieldDescription>
          ) : null}
          <FieldError id="listing-status-error" errors={[fieldState.error]} />
        </Field>
      )}
    />
  );
}

export function ListingPrivateNoteField({
  form,
  disabled,
  help = "Optional. Only you can see this note.",
}: ListingFieldsProps) {
  return (
    <Controller
      control={form.control}
      name="privateNote"
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid} data-disabled={disabled}>
          <FieldLabel htmlFor="listing-private-note">Private Notes</FieldLabel>
          <Textarea
            {...field}
            id="listing-private-note"
            value={field.value ?? ""}
            disabled={disabled}
            aria-invalid={fieldState.invalid}
            aria-describedby={
              fieldState.invalid
                ? "listing-private-note-help listing-private-note-error"
                : help
                  ? "listing-private-note-help"
                  : undefined
            }
          />
          {help ? (
            <FieldDescription id="listing-private-note-help">
              {help}
            </FieldDescription>
          ) : null}
          <FieldError
            id="listing-private-note-error"
            errors={[fieldState.error]}
          />
        </Field>
      )}
    />
  );
}

export function ListingDetailsFields(props: ListingFieldsProps) {
  return (
    <>
      <ListingDescriptionField {...props} />
      <ListingPriceField {...props} />
      <ListingStatusField {...props} />
      <ListingPrivateNoteField {...props} />
    </>
  );
}

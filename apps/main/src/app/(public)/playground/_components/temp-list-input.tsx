"use client";

import { useId } from "react";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

import type { CultivarMatchCandidate } from "@/lib/catalog-importer";
import {
  createTempListing,
  tempListingInputSchema,
  MAX_TEMP_LISTINGS,
  type TempInputBatch,
} from "../_lib/temp-list";
import type { CatalogInputDraft } from "@/lib/catalog-input";
import { TempListCultivarSearch } from "./temp-list-cultivar-search";
import { TempListSpreadsheetInput } from "./temp-list-spreadsheet-input";

export function TempListInput({
  disabled,
  checking = false,
  remaining,
  summary,
  draft,
  onAdd,
  onSelect,
  onSourceChange,
  onDraftChange,
}: {
  disabled: boolean;
  checking?: boolean;
  remaining: number;
  summary: string | null;
  draft: CatalogInputDraft;
  onDraftChange: (change: Partial<CatalogInputDraft>) => void;
  onAdd: (batch: TempInputBatch) => Promise<boolean>;
  onSelect: (cultivar: CultivarMatchCandidate) => void;
  onSourceChange: () => void;
}) {
  const namesId = useId();
  const errorId = `${namesId}-error`;
  const { names } = draft;
  const entries = names
    .split(/\r\n|\n|\r/)
    .map((name) => name.trim())
    .filter(Boolean);
  const invalidName = entries
    .map((name) => tempListingInputSchema.shape.name.safeParse(name))
    .find((result) => !result.success);
  const pasteError = names.includes("\t")
    ? "This looks like several columns. Upload the spreadsheet to keep all its data."
    : entries.length > remaining
      ? `There is room for ${remaining} more flowers. Each catalog can contain ${MAX_TEMP_LISTINGS}.`
      : (invalidName?.error?.issues[0]?.message ?? null);

  return (
    <section
      className="flex min-w-0 flex-col gap-5"
      aria-label="Add flowers"
      aria-busy={checking}
    >
      <p role="status" className="text-muted-foreground text-sm">
        There is room for {remaining.toLocaleString()} more flowers. Each
        catalog can contain {MAX_TEMP_LISTINGS.toLocaleString()}.
      </p>
      <Tabs
        value={draft.input}
        onValueChange={(input) => {
          if (
            input === "single" ||
            input === "paste" ||
            input === "spreadsheet"
          )
            onDraftChange({ input });
        }}
      >
        <TabsList
          aria-label="Input type"
          className="grid h-auto w-full max-w-3xl grid-cols-3"
        >
          <TabsTrigger value="single" disabled={disabled}>
            Single search
          </TabsTrigger>
          <TabsTrigger value="paste" disabled={disabled}>
            Paste names
          </TabsTrigger>
          <TabsTrigger value="spreadsheet" disabled={disabled}>
            Spreadsheet
          </TabsTrigger>
        </TabsList>
        <TabsContent value="single" className="mt-6 max-w-3xl">
          <div className="flex flex-col items-start gap-3">
            <div className="w-full">
              <TempListCultivarSearch
                disabled={disabled || remaining === 0}
                onSelect={onSelect}
              />
            </div>
          </div>
        </TabsContent>
        <TabsContent value="paste" className="mt-6 max-w-3xl">
          <form
            className="flex flex-col items-start gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (disabled || pasteError || !entries.length) return;
              void onAdd({ listings: entries.map(createTempListing) });
            }}
          >
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor={namesId} className="sr-only">
                  Cultivar names
                </FieldLabel>

                <Textarea
                  id={namesId}
                  aria-invalid={Boolean(pasteError)}
                  aria-describedby={pasteError ? errorId : undefined}
                  aria-label="Cultivar names"
                  className="min-h-40"
                  placeholder={
                    "One name per line\nStella de Oro\nHappy Returns"
                  }
                  value={names}
                  maxLength={1_005_000}
                  disabled={disabled}
                  onChange={(event) => {
                    onSourceChange();
                    onDraftChange({ names: event.target.value });
                  }}
                />
              </Field>
            </FieldGroup>

            {pasteError ? (
              <FieldError id={errorId}>{pasteError}</FieldError>
            ) : null}
            <Button
              type="submit"
              disabled={
                disabled ||
                remaining === 0 ||
                !entries.length ||
                Boolean(pasteError)
              }
            >
              {checking ? "Checking…" : "Check names"}
            </Button>
          </form>
        </TabsContent>
        <TabsContent
          value="spreadsheet"
          forceMount
          className="mt-6 data-[state=inactive]:hidden"
        >
          <TempListSpreadsheetInput
            disabled={disabled || remaining === 0}
            checking={checking}
            remaining={remaining}
            summary={summary}
            sheetDraft={draft.sheet}
            onSheetChange={(sheet) => onDraftChange({ sheet })}
            onAdd={onAdd}
            onSourceChange={onSourceChange}
          />
        </TabsContent>
      </Tabs>
    </section>
  );
}

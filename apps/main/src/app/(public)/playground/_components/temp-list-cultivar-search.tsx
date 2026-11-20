"use client";

import { useId, useRef, useState } from "react";
import { CultivarOption } from "@/components/catalog-builder/cultivar-option";
import { useQuery } from "@tanstack/react-query";
import { useDebouncedCallback } from "use-debounce";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { getQueryClient } from "@/trpc/query-client";
import type { CultivarMatchCandidate } from "@/lib/catalog-importer";
import type { CultivarSearchResponse } from "@/app/(public)/cultivars/_components/cultivar-search-page-client";
import { getCandidateMeta } from "@/lib/catalog-presentation";

export function TempListCultivarSearch({
  disabled,
  onSelect,
}: {
  disabled: boolean;
  onSelect: (cultivar: CultivarMatchCandidate) => void;
}) {
  const searchId = useId();
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const updateQuery = useDebouncedCallback(setQuery, 400);
  const search = useQuery(
    {
      queryKey: ["temp-list-search", query],
      queryFn: async ({ signal }) => {
        const params = new URLSearchParams({
          cultivarName: query,
          mode: "summary",
          limit: "8",
        });
        const response = await fetch(`/api/v1/cultivars/search?${params}`, {
          signal,
        });
        const data = (await response.json()) as CultivarSearchResponse & {
          message?: string;
        };
        if (!response.ok) {
          throw new Error(data.message ?? "Could not search cultivars.");
        }
        return data.results.map(
          (result): CultivarMatchCandidate => ({
            ...result.traits,
            awardNames: result.traits.awards
              .map((award) => award.name)
              .join(", "),
            confidence: 100,
            cultivarReferenceId: result.cultivarReferenceId,
            displayName: result.name,
            imageAsset: result.imageAsset,
            imageUrl: result.imageUrl,
            listingCount: result.listingSummary.forSaleListings,
            normalizedName: result.normalizedName,
          }),
        );
      },
      enabled: !disabled && query.length >= 3 && query === input.trim(),
      staleTime: 0,
      retry: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
    getQueryClient(),
  );
  const current = query === input.trim() && query.length >= 3;

  return (
    <div className="flex flex-col gap-3">
      <Field>
        <FieldLabel htmlFor={searchId} className="sr-only">
          Search cultivars
        </FieldLabel>
        <Input
          ref={inputRef}
          id={searchId}
          placeholder="Type a cultivar name…"
          maxLength={160}
          disabled={disabled}
          value={input}
          onChange={(event) => {
            setInput(event.target.value);
            updateQuery(event.target.value.trim());
          }}
        />
      </Field>
      <div aria-live="polite">
        {input.trim().length < 3 ? null : !current || search.isFetching ? (
          <p className="text-muted-foreground text-sm">Searching…</p>
        ) : search.error ? (
          <div className="flex flex-wrap items-center gap-2">
            <p role="alert" className="text-destructive text-sm">
              {search.error.message}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() => void search.refetch()}
            >
              Retry
            </Button>
          </div>
        ) : search.data?.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No matches. Try another name.
          </p>
        ) : null}
      </div>
      {current && !search.isFetching && search.data?.length ? (
        <div className="flex flex-col gap-2" aria-label="Cultivar results">
          {search.data.map((cultivar) => (
            <CultivarOption
              key={cultivar.cultivarReferenceId}
              cultivar={cultivar}
              disabled={disabled}
              aria-label={`Add ${cultivar.displayName}`}
              onClick={() => {
                onSelect(cultivar);
                updateQuery.cancel();
                setInput("");
                setQuery("");
                inputRef.current?.focus();
              }}
            >
              {getCandidateMeta(cultivar)}
            </CultivarOption>
          ))}
        </div>
      ) : null}
    </div>
  );
}

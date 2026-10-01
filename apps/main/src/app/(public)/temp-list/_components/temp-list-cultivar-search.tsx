"use client";

import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDebouncedCallback } from "use-debounce";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { getQueryClient } from "@/trpc/query-client";
import type { CultivarMatchCandidate } from "@/lib/catalog-importer";
import type { CultivarSearchResponse } from "@/app/(public)/cultivars/_components/cultivar-search-page-client";
import { getCandidateMeta } from "@/app/(public)/catalog-importer/_lib/catalog-importer-presentation";

export function TempListCultivarSearch({
  disabled,
  onSelect,
}: {
  disabled: boolean;
  onSelect: (cultivar: CultivarMatchCandidate) => void;
}) {
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
      staleTime: Infinity,
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
        <FieldLabel htmlFor="temp-cultivar-search">Search cultivars</FieldLabel>
        <Input
          ref={inputRef}
          id="temp-cultivar-search"
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
        {input.trim().length < 3 ? (
          <p className="text-muted-foreground text-sm">
            Enter at least three characters. Click a result to add it to your
            list.
          </p>
        ) : !current || search.isFetching ? (
          <p className="text-muted-foreground text-sm">Searching…</p>
        ) : search.error ? (
          <p role="alert" className="text-destructive text-sm">
            {search.error.message}
          </p>
        ) : search.data?.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No cultivars found. Try another name, or add a listing manually.
          </p>
        ) : null}
      </div>
      {current && !search.isFetching && search.data?.length ? (
        <div className="flex flex-col gap-2" aria-label="Cultivar results">
          {search.data.map((cultivar) => (
            <Button
              key={cultivar.cultivarReferenceId}
              type="button"
              variant="outline"
              className="h-auto justify-start text-left whitespace-normal"
              disabled={disabled}
              onClick={() => {
                onSelect(cultivar);
                updateQuery.cancel();
                setInput("");
                setQuery("");
                inputRef.current?.focus();
              }}
            >
              <span className="flex flex-col gap-1">
                <span>{cultivar.displayName}</span>
                <span className="text-muted-foreground text-xs">
                  {getCandidateMeta(cultivar)}
                </span>
              </span>
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

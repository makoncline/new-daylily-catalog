"use client";

import { Button } from "@daylily-catalog/ui/components/button";
import { Checkbox } from "@daylily-catalog/ui/components/checkbox";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@daylily-catalog/ui/components/empty";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@daylily-catalog/ui/components/field";
import { Input } from "@daylily-catalog/ui/components/input";
import { cn } from "@daylily-catalog/ui/lib/utils";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@daylily-catalog/ui/components/select";
import { toast } from "@daylily-catalog/ui/components/sonner";
import {
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Search,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

import type { StorefrontListingFilters } from "@/types/storefront-query";

import { ListingCard, type CatalogListingCardData } from "./listing-card";

interface CatalogFilterOptions {
  chars: string[];
  hybridizers: string[];
  years: string[];
  ploidies: string[];
  forms: string[];
  foliageTypes: string[];
  fragrances: string[];
  bloomSeasons: string[];
}

interface CatalogListOption {
  value: string;
  label: string;
}

interface CatalogPagination {
  page: number;
  pageCount: number;
  total: number;
}

function CatalogPaginationNav({
  label,
  pagination,
  pageHref,
  onPageRequest,
}: {
  label: string;
  pagination: CatalogPagination;
  pageHref: (page: number) => string;
  onPageRequest: (page: number) => void;
}) {
  const [pageValue, setPageValue] = React.useState(String(pagination.page));

  React.useEffect(() => {
    setPageValue(String(pagination.page));
  }, [pagination.page]);

  if (pagination.pageCount <= 1) return null;

  const submitPage = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const requestedPage = Number(pageValue);
    if (!Number.isFinite(requestedPage)) return;
    const page = Math.min(
      pagination.pageCount,
      Math.max(1, Math.trunc(requestedPage)),
    );
    setPageValue(String(page));
    onPageRequest(page);
  };

  return (
    <nav
      className="flex flex-wrap items-center justify-center gap-3"
      aria-label={label}
    >
      {pagination.page > 1 ? (
        <Button asChild variant="outline">
          <Link href={pageHref(pagination.page - 1)} prefetch={false}>
            <ChevronLeft data-icon="inline-start" aria-hidden="true" /> Previous
          </Link>
        </Button>
      ) : (
        <Button variant="outline" disabled>
          <ChevronLeft data-icon="inline-start" aria-hidden="true" /> Previous
        </Button>
      )}
      <span className="text-sm">
        Page {pagination.page} of {pagination.pageCount}
      </span>
      {pagination.page < pagination.pageCount ? (
        <Button asChild variant="outline">
          <Link href={pageHref(pagination.page + 1)} prefetch={false}>
            Next <ChevronRight data-icon="inline-end" aria-hidden="true" />
          </Link>
        </Button>
      ) : (
        <Button variant="outline" disabled>
          Next <ChevronRight data-icon="inline-end" aria-hidden="true" />
        </Button>
      )}
      <form className="flex items-center gap-2" onSubmit={submitPage}>
        <Input
          name="page"
          type="number"
          min={1}
          max={pagination.pageCount}
          value={pageValue}
          onChange={(event) => setPageValue(event.target.value)}
          className="w-20"
          aria-label="Page number"
        />
        <Button type="submit" variant="secondary">
          Go
        </Button>
      </form>
    </nav>
  );
}

function TextFilter({
  label,
  name,
  value,
  placeholder,
  onCommit,
}: {
  label: string;
  name: string;
  value: string;
  placeholder?: string;
  onCommit: (name: string, value: string) => void;
}) {
  const [localValue, setLocalValue] = React.useState(value);
  React.useEffect(() => setLocalValue(value), [value]);
  React.useEffect(() => {
    if (localValue === value) return;
    const timeout = window.setTimeout(() => onCommit(name, localValue), 300);
    return () => window.clearTimeout(timeout);
  }, [localValue, name, onCommit, value]);

  return (
    <Field>
      <FieldLabel htmlFor={`filter-${name}`}>{label}</FieldLabel>
      <Input
        id={`filter-${name}`}
        value={localValue}
        placeholder={placeholder}
        onChange={(event) => setLocalValue(event.target.value)}
      />
    </Field>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  const id = React.useId();
  return (
    <Field>
      <FieldLabel id={`${id}-label`}>{label}</FieldLabel>
      <Select
        value={value || "any"}
        onValueChange={(next) => onChange(next === "any" ? "" : next)}
      >
        <SelectTrigger aria-labelledby={`${id}-label`}>
          <SelectValue placeholder={`Any ${label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>{label}</SelectLabel>
            <SelectItem value="any">Any</SelectItem>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  );
}

export function CatalogBrowser({
  title,
  description,
  listings,
  filters,
  filterOptions,
  listOptions,
  pagination,
  allowListFilter = false,
}: {
  title: string;
  description: string;
  listings: CatalogListingCardData[];
  filters: StorefrontListingFilters;
  filterOptions: CatalogFilterOptions;
  listOptions: CatalogListOption[];
  pagination: CatalogPagination;
  allowListFilter?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = React.useTransition();
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const previousSearch = React.useRef(searchParams.toString());

  React.useEffect(() => {
    const currentSearch = searchParams.toString();
    if (currentSearch === previousSearch.current) return;
    previousSearch.current = currentSearch;
    toast(
      `${pagination.total.toLocaleString()} ${pagination.total === 1 ? "daylily" : "daylilies"} found.`,
      { id: "catalog-results", duration: 2500 },
    );
  }, [pagination.total, searchParams]);

  const updateParam = React.useCallback(
    (name: string, value: string) => {
      const next = new URLSearchParams(searchParams.toString());
      if (value) next.set(name, value);
      else next.delete(name);
      next.delete("page");
      startTransition(() =>
        router.replace(`${pathname}${next.size ? `?${next}` : ""}`, {
          scroll: false,
        }),
      );
    },
    [pathname, router, searchParams],
  );

  const stringOptions = (values: string[]) =>
    values.map((value) => ({ value, label: value }));
  const pageHref = (page: number) => {
    const next = new URLSearchParams(searchParams.toString());
    if (page <= 1) next.delete("page");
    else next.set("page", String(page));
    return `${pathname}${next.size ? `?${next}` : ""}`;
  };
  const goToPage = (page: number) => {
    startTransition(() => router.push(pageHref(page), { scroll: true }));
  };
  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return (
    <div id="catalog-top" className="grid gap-8 py-8 lg:py-14">
      <header className="grid max-w-3xl gap-3">
        <p className="text-primary text-sm font-semibold tracking-[0.2em] uppercase">
          Daylily catalog
        </p>
        <h1 className="font-serif text-4xl font-semibold tracking-tight lg:text-6xl">
          {title}
        </h1>
        <p className="text-muted-foreground text-lg">{description}</p>
      </header>

      <section
        className="bg-card rounded-xl border p-5 shadow-sm"
        aria-label="Catalog filters"
      >
        <Button
          type="button"
          variant="outline"
          className="w-full lg:hidden"
          aria-expanded={filtersOpen}
          aria-controls="catalog-filter-controls"
          onClick={() => setFiltersOpen((current) => !current)}
        >
          {filtersOpen
            ? "Hide filters"
            : `Show filters${activeFilterCount > 0 ? ` (${activeFilterCount} active)` : ""}`}
        </Button>
        <FieldGroup
          id="catalog-filter-controls"
          className={cn(
            "mt-5 grid-cols-1 gap-5 sm:grid-cols-2 lg:mt-0 lg:grid lg:grid-cols-4",
            filtersOpen ? "grid" : "hidden",
          )}
        >
          <TextFilter
            label="Name"
            name="name"
            value={filters.name ?? ""}
            placeholder="Search names"
            onCommit={updateParam}
          />
          <FilterSelect
            label="First character"
            value={filters.char ?? ""}
            options={stringOptions(filterOptions.chars)}
            onChange={(value) => updateParam("char", value)}
          />
          {allowListFilter ? (
            <FilterSelect
              label="List"
              value={filters.list ?? ""}
              options={listOptions}
              onChange={(value) => updateParam("list", value)}
            />
          ) : null}
          <TextFilter
            label="Color"
            name="color"
            value={filters.color ?? ""}
            onCommit={updateParam}
          />
          <FilterSelect
            label="Hybridizer"
            value={filters.hybridizer ?? ""}
            options={stringOptions(filterOptions.hybridizers)}
            onChange={(value) => updateParam("hybridizer", value)}
          />
          <FilterSelect
            label="Year"
            value={filters.year ?? ""}
            options={stringOptions(filterOptions.years)}
            onChange={(value) => updateParam("year", value)}
          />
          <FilterSelect
            label="Ploidy"
            value={filters.ploidy ?? ""}
            options={stringOptions(filterOptions.ploidies)}
            onChange={(value) => updateParam("ploidy", value)}
          />
          <FilterSelect
            label="Form"
            value={filters.form ?? ""}
            options={stringOptions(filterOptions.forms)}
            onChange={(value) => updateParam("form", value)}
          />
          <FilterSelect
            label="Foliage type"
            value={filters.foliageType ?? ""}
            options={stringOptions(filterOptions.foliageTypes)}
            onChange={(value) => updateParam("foliageType", value)}
          />
          <FilterSelect
            label="Fragrance"
            value={filters.fragrance ?? ""}
            options={stringOptions(filterOptions.fragrances)}
            onChange={(value) => updateParam("fragrance", value)}
          />
          <FilterSelect
            label="Bloom season"
            value={filters.bloomSeason ?? ""}
            options={stringOptions(filterOptions.bloomSeasons)}
            onChange={(value) => updateParam("bloomSeason", value)}
          />
          <FilterSelect
            label="Bloom size"
            value={filters.bloomSize ?? ""}
            options={[
              { value: "miniature", label: 'Up to 3"' },
              { value: "small", label: 'Over 3" to 4.5"' },
              { value: "large", label: 'Over 4.5" to under 7"' },
              { value: "extra-large", label: '7" and larger' },
            ]}
            onChange={(value) => updateParam("bloomSize", value)}
          />
          <FilterSelect
            label="Scape height"
            value={filters.scapeHeight ?? ""}
            options={[
              { value: "miniature", label: 'Up to 10"' },
              { value: "short", label: 'Over 10" to 20"' },
              { value: "medium", label: 'Over 20" to 30"' },
              { value: "tall", label: 'Over 30" to 40"' },
              { value: "extra-tall", label: 'Over 40"' },
            ]}
            onChange={(value) => updateParam("scapeHeight", value)}
          />
          <FilterSelect
            label="Price"
            value={filters.price ?? ""}
            options={[
              { value: "under-10", label: "Under $10" },
              { value: "10-to-19", label: "$10 to under $20" },
              { value: "20-to-29", label: "$20 to under $30" },
              { value: "30-to-39", label: "$30 to under $40" },
              { value: "40-to-49", label: "$40 to under $50" },
              { value: "50-plus", label: "$50 and more" },
            ]}
            onChange={(value) => updateParam("price", value)}
          />
          <TextFilter
            label="Public note"
            name="note"
            value={filters.note ?? ""}
            onCommit={updateParam}
          />
          <Field orientation="horizontal" className="min-h-10 self-end">
            <Checkbox
              id="filter-rebloom"
              checked={filters.rebloom ?? false}
              onCheckedChange={(checked) =>
                updateParam("rebloom", checked === true ? "true" : "")
              }
            />
            <FieldLabel htmlFor="filter-rebloom">Rebloomers only</FieldLabel>
          </Field>
          <Field className="justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                startTransition(() =>
                  router.replace(pathname, { scroll: false }),
                )
              }
            >
              <RotateCcw data-icon="inline-start" aria-hidden="true" /> Clear
              filters
            </Button>
          </Field>
        </FieldGroup>
      </section>

      <div
        className="flex flex-wrap items-center justify-between gap-3"
        aria-live="polite"
      >
        <p className="font-medium">
          {pagination.total.toLocaleString()}{" "}
          {pagination.total === 1 ? "daylily" : "daylilies"}
          {activeFilterCount > 0
            ? ` · ${activeFilterCount} active ${activeFilterCount === 1 ? "filter" : "filters"}`
            : ""}
        </p>
        {isPending ? (
          <p className="text-muted-foreground text-sm">Updating results…</p>
        ) : null}
      </div>

      <CatalogPaginationNav
        label="Catalog pages above results"
        pagination={pagination}
        pageHref={pageHref}
        onPageRequest={goToPage}
      />

      {listings.length ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((listing, index) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              priority={index < 3}
            />
          ))}
        </div>
      ) : (
        <Empty className="border py-16">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Search aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle className="font-serif text-2xl">
              No daylilies match
            </EmptyTitle>
            <EmptyDescription>
              Clear one or more filters and try again.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      <CatalogPaginationNav
        label="Catalog pages below results"
        pagination={pagination}
        pageHref={pageHref}
        onPageRequest={goToPage}
      />
      <Button asChild variant="ghost" className="justify-self-center">
        <Link href="#catalog-top">
          <ArrowUp data-icon="inline-start" aria-hidden="true" /> Back to top
        </Link>
      </Button>
    </div>
  );
}

"use client";

import type { ComponentProps, ReactNode } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export interface CatalogSearchSelectOption {
  label: string;
  value: string;
}

function Root({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="catalog-search"
      className={cn("space-y-3", className)}
      {...props}
    />
  );
}

function Toolbar({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="catalog-search-toolbar"
      className={cn("flex items-end gap-3", className)}
      {...props}
    />
  );
}

function Query({
  className,
  inputClassName,
  onChange,
  onSubmit,
  placeholder,
  showSearchIcon = true,
  value,
}: {
  className?: string;
  inputClassName?: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder: string;
  showSearchIcon?: boolean;
  value: string;
}) {
  return (
    <div
      className={cn("relative min-w-0 flex-1", className)}
      data-slot="catalog-search-query"
      data-testid="search-query-form"
    >
      {showSearchIcon ? (
        <Search
          aria-hidden="true"
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2"
        />
      ) : null}
      <Input
        placeholder={placeholder}
        value={value}
        className={cn("h-10", showSearchIcon && "pl-9", inputClassName)}
        data-testid="search-all-fields-input"
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") onSubmit?.();
        }}
      />
    </div>
  );
}

function ModeToggle({
  checked,
  id,
  label = "Advanced",
  onCheckedChange,
}: {
  checked: boolean;
  id: string;
  label?: string;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <label
      htmlFor={id}
      className="grid grid-rows-[auto_2rem] justify-items-center gap-1"
      data-slot="catalog-search-mode-toggle"
      data-testid="search-mode-toggle"
    >
      <span className="text-xs font-medium tracking-wide uppercase">
        {label}
      </span>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        data-testid="search-mode-switch"
      />
    </label>
  );
}

function Filters({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="catalog-search-filters"
      className={cn(
        "grid gap-3 rounded-lg border p-3 sm:grid-cols-3",
        className,
      )}
      {...props}
    />
  );
}

function SelectFilter({
  allLabel,
  allValue = "all",
  label,
  onValueChange,
  options,
  value,
}: {
  allLabel: string;
  allValue?: string;
  label: string;
  onValueChange: (value: string) => void;
  options: CatalogSearchSelectOption[];
  value: string;
}) {
  return (
    <label
      className="space-y-1.5 text-sm font-medium"
      data-slot="catalog-search-select-filter"
    >
      {label}
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={allValue}>{allLabel}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}

function ResultCount({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      data-slot="catalog-search-result-count"
      className={cn("text-muted-foreground text-sm tabular-nums", className)}
    >
      {children}
    </p>
  );
}

function Empty({ children, className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="catalog-search-empty"
      className={cn(
        "text-muted-foreground flex min-h-48 flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-center text-sm",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export const CatalogSearch = {
  Empty,
  Filters,
  ModeToggle,
  Query,
  ResultCount,
  Root,
  SelectFilter,
  Toolbar,
};

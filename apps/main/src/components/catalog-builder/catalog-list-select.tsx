"use client";

import { useId, useState } from "react";
import { Check, Plus, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandItem,
  CommandGroup,
  CommandEmpty,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

export interface CatalogListSelectProps {
  options: string[];
  values: string[];
  onChange: (values: string[]) => void;
  label?: string;
  multiple?: boolean;
  inline?: boolean;
  disabled?: boolean;
  className?: string;
}

const listKey = (value: string) =>
  value.trim().replace(/\s+/g, " ").toLowerCase();

export function CatalogListSelect({
  options,
  values,
  onChange,
  label = "Lists",
  multiple = true,
  inline = true,
  disabled = false,
  className,
}: CatalogListSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const id = useId();
  const names = [
    ...new Map(
      [...options, ...values].map((name) => [listKey(name), name]),
    ).values(),
  ]
    .filter((name) => listKey(name))
    .sort((a, b) => a.localeCompare(b));
  const selectedKeys = new Set(values.map(listKey));
  const title = search.trim().replace(/\s+/g, " ");
  const showBadges = multiple && inline;
  const filtered = names.filter((name) =>
    listKey(name).includes(listKey(search)),
  );
  const canCreate =
    title.length > 0 && !names.some((name) => listKey(name) === listKey(title));

  function select(name: string) {
    onChange(
      multiple
        ? selectedKeys.has(listKey(name))
          ? values.filter((value) => listKey(value) !== listKey(name))
          : [...values, name]
        : [name],
    );
    if (!multiple) setOpen(false);
    setSearch("");
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setSearch("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant={showBadges ? "ghost" : "outline"}
          disabled={disabled}
          className={cn(
            showBadges
              ? "h-auto min-h-10 w-40 justify-start"
              : "w-full justify-between",
            className,
          )}
          role="combobox"
          aria-label={label}
          aria-expanded={open}
          aria-controls={id}
          title={values.length ? values.join(", ") : label}
        >
          {showBadges ? (
            <span className="flex min-w-0 flex-wrap items-center gap-1">
              {values.length ? (
                <>
                  {values.slice(0, 1).map((name) => (
                    <Badge
                      key={name}
                      variant="secondary"
                      className="max-w-28 min-w-0"
                    >
                      <span className="truncate">{name}</span>
                    </Badge>
                  ))}
                  {values.length > 1 ? (
                    <span className="text-muted-foreground text-xs">
                      +{values.length - 1}
                    </span>
                  ) : null}
                </>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </span>
          ) : (
            <>
              <span
                className={cn(
                  "truncate",
                  !values.length && "text-muted-foreground",
                )}
              >
                {values.length ? values.join(", ") : "Select list"}
              </span>
              <ChevronDown aria-hidden="true" />
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            aria-label="Find or create a list"
            placeholder="Find or create a list…"
            value={search}
            onValueChange={setSearch}
            maxLength={200}
          />
          <CommandList id={id} aria-label={label}>
            {!names.length && !title ? (
              <CommandEmpty>Type a name to create a list.</CommandEmpty>
            ) : null}
            <CommandGroup>
              {filtered.map((name) => (
                <CommandItem
                  key={name}
                  value={name}
                  onSelect={() => select(name)}
                >
                  <Check
                    className={
                      selectedKeys.has(listKey(name))
                        ? "opacity-100"
                        : "opacity-0"
                    }
                    aria-hidden="true"
                  />
                  <span className="min-w-0 break-words">{name}</span>
                </CommandItem>
              ))}
              {canCreate ? (
                <CommandItem
                  value={`create:${title}`}
                  onSelect={() => select(title)}
                >
                  <Plus aria-hidden="true" />
                  <span className="min-w-0 break-words">Create “{title}”</span>
                </CommandItem>
              ) : null}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

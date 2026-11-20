"use client";

import { useEffect, useRef, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useLocalStorage } from "@/hooks/use-local-storage";
import {
  generateTempCatalogPdf,
  renderTempCatalogFirstPage,
} from "../_lib/temp-list-downloads";
import type { TempPreviewRow } from "../_lib/temp-list";

export function TempCatalogPrint({
  rows,
  disabled,
}: {
  rows: TempPreviewRow[];
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [variant, setVariant] = useLocalStorage<"print" | "share">(
    "temp-list-card-style",
    "print",
  );
  const [cardsPerPage, setCardsPerPage] = useLocalStorage<1 | 2 | 4>(
    "temp-list-cards-per-page",
    1,
  );
  const [working, setWorking] = useState(false);
  const [completed, setCompleted] = useState(0);
  const [total, setTotal] = useState(0);
  const [result, setResult] = useState<{
    url: string;
    previewUrl: string;
    complete: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const resources = useRef({
    controller: null as AbortController | null,
    imageCache: new Map<string, Uint8Array>(),
    urls: [] as string[],
  });

  useEffect(() => {
    const current = resources.current;
    return () => {
      current.controller?.abort();
      current.urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  function cancel() {
    resources.current.controller?.abort();
    resources.current.controller = null;
    setWorking(false);
  }

  function clearResult() {
    resources.current.urls.forEach((url) => URL.revokeObjectURL(url));
    resources.current.urls = [];
    setResult(null);
  }

  async function generate(
    all: boolean,
    nextCount = cardsPerPage,
    nextVariant = variant,
  ) {
    if (disabled || rows.length === 0) return;
    const current = resources.current;
    current.controller?.abort();
    const controller = new AbortController();
    current.controller = controller;
    if (!all) clearResult();
    setError(null);
    setWorking(true);
    setCompleted(0);
    const pageRows = all ? rows : rows.slice(0, nextCount);
    setTotal(pageRows.length);
    try {
      const blob = await generateTempCatalogPdf({
        rows: pageRows,
        variant: nextVariant,
        cardsPerPage: nextCount,
        onProgress: (count) => {
          if (!controller.signal.aborted) setCompleted(count);
        },
        imageCache: current.imageCache,
        signal: controller.signal,
      });
      controller.signal.throwIfAborted();
      const preview = await renderTempCatalogFirstPage(blob, controller.signal);
      controller.signal.throwIfAborted();
      const url = URL.createObjectURL(blob);
      const previewUrl = URL.createObjectURL(preview);
      current.urls.forEach((previous) => URL.revokeObjectURL(previous));
      current.urls = [url, previewUrl];
      setResult({ url, previewUrl, complete: pageRows.length === rows.length });
    } catch (failure) {
      if (!controller.signal.aborted)
        setError(
          failure instanceof Error
            ? failure.message
            : "Could not generate the cards. Try again.",
        );
    } finally {
      if (current.controller === controller) {
        current.controller = null;
        setWorking(false);
      }
    }
  }

  if (!open)
    return (
      <Button
        disabled={disabled || rows.length === 0}
        onClick={() => {
          setOpen(true);
          void generate(false);
        }}
      >
        Generate printable cards
      </Button>
    );

  return (
    <section
      className="flex w-full min-w-0 flex-col gap-4"
      aria-label="Printable cards"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-semibold">Printable cards</h3>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Close printable cards"
          onClick={() => {
            cancel();
            clearResult();
            setError(null);
            setOpen(false);
          }}
        >
          <X aria-hidden="true" />
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={String(cardsPerPage)}
          disabled={working || disabled}
          onValueChange={(value) => {
            const count = value === "4" ? 4 : value === "2" ? 2 : 1;
            setCardsPerPage(count);
            void generate(false, count);
          }}
        >
          <SelectTrigger aria-label="Cards per PDF page" className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {[1, 2, 4].map((count) => (
                <SelectItem key={count} value={String(count)}>
                  {count} per page
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <ToggleGroup
          type="single"
          variant="outline"
          value={variant}
          disabled={working || disabled}
          aria-label="Card style"
          onValueChange={(value) => {
            if (value !== "print" && value !== "share") return;
            setVariant(value);
            void generate(false, cardsPerPage, value);
          }}
        >
          <ToggleGroupItem value="print">Light</ToggleGroupItem>
          <ToggleGroupItem value="share">Dark</ToggleGroupItem>
        </ToggleGroup>
      </div>
      {working ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <p role="status" className="text-muted-foreground text-sm">
              {completed === total
                ? "Rendering preview…"
                : `Generating ${completed} of ${total}…`}
            </p>
            <Button variant="ghost" size="sm" onClick={cancel}>
              Cancel
            </Button>
          </div>
          <Progress
            value={total ? (completed / total) * 100 : 0}
            aria-label="Card generation"
          />
        </div>
      ) : null}
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {result ? (
        <>
          <p className="text-muted-foreground text-sm">
            {result.complete
              ? `${rows.length} ${rows.length === 1 ? "card" : "cards"} · ${Math.ceil(rows.length / cardsPerPage)} ${rows.length <= cardsPerPage ? "page" : "pages"}`
              : "First page preview"}
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt="First page preview"
            src={result.previewUrl}
            className="mx-auto h-auto w-full max-w-4xl rounded-md border"
          />
          {!working ? (
            <div>
              {result.complete ? (
                <Button asChild>
                  <a
                    href={result.url}
                    download={`playground-catalog-${variant === "print" ? "light" : "dark"}.pdf`}
                  >
                    <Download data-icon="inline-start" />
                    Download PDF
                  </a>
                </Button>
              ) : (
                <Button disabled={disabled} onClick={() => void generate(true)}>
                  Generate all {rows.length} cards
                </Button>
              )}
            </div>
          ) : null}
        </>
      ) : !working ? (
        <Button
          disabled={disabled}
          className="self-start"
          onClick={() => void generate(false)}
        >
          Preview page
        </Button>
      ) : null}
    </section>
  );
}

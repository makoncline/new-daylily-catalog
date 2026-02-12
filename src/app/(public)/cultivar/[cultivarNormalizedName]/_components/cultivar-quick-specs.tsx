"use client";

import { useMemo, useState } from "react";
import { Copy, CopyCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Muted, P } from "@/components/typography";
import { type RouterOutputs } from "@/trpc/react";

type CultivarPageOutput = NonNullable<RouterOutputs["public"]["getCultivarPage"]>;
type QuickSpec = CultivarPageOutput["quickSpecs"]["all"][number];

interface CultivarQuickSpecsProps {
  cultivarName: string;
  hybridizer: string | null;
  year: string | null;
  topSpecs: QuickSpec[];
  allSpecs: QuickSpec[];
}

export function CultivarQuickSpecs({
  cultivarName,
  hybridizer,
  year,
  topSpecs,
  allSpecs,
}: CultivarQuickSpecsProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const summarySpecs = useMemo(
    () =>
      [
        { label: "Name", value: cultivarName },
        { label: "Hybridizer", value: hybridizer },
        { label: "Year", value: year },
      ].filter((spec): spec is { label: string; value: string } => Boolean(spec.value)),
    [cultivarName, hybridizer, year],
  );

  const topWithSummary = useMemo(
    () => [...summarySpecs, ...topSpecs],
    [summarySpecs, topSpecs],
  );
  const allWithSummary = useMemo(
    () => [...summarySpecs, ...allSpecs],
    [summarySpecs, allSpecs],
  );

  const visibleSpecs = expanded ? allWithSummary : topWithSummary;

  const copyValue = useMemo(
    () => allWithSummary.map((spec) => `${spec.label}: ${spec.value}`).join("\n"),
    [allWithSummary],
  );

  if (allWithSummary.length === 0) {
    return null;
  }

  const canExpand = allWithSummary.length > topWithSummary.length;

  const onCopy = async () => {
    await navigator.clipboard.writeText(copyValue);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <section id="quick-specs" aria-label="Quick specs" className="space-y-3">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-3xl">Quick Specs</CardTitle>

          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => void onCopy()}>
              {copied ? <CopyCheck className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              <span>{copied ? "Copied" : "Copy specs"}</span>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {visibleSpecs.map((spec) => (
              <div key={spec.label} className="space-y-1 border-b pb-2 last:border-none">
                <Muted className="text-xs uppercase tracking-wide">{spec.label}</Muted>
                <P className="text-base font-medium">{spec.value}</P>
              </div>
            ))}
          </div>

          {canExpand && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setExpanded((value) => !value)}
            >
              <Sparkles className="h-4 w-4" />
              <span>{expanded ? "Show key specs" : "Show all specs"}</span>
            </Button>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

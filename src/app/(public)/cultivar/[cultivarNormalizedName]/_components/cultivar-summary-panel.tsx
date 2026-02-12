"use client";

import Link from "next/link";
import { ArrowRight, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { H1, Muted } from "@/components/typography";
import { type RouterOutputs } from "@/trpc/react";

type CultivarPageOutput = NonNullable<RouterOutputs["public"]["getCultivarPage"]>;
type CultivarSummary = CultivarPageOutput["summary"];

interface CultivarSummaryPanelProps {
  summary: CultivarSummary;
}

export function CultivarSummaryPanel({ summary }: CultivarSummaryPanelProps) {
  const secondaryLineParts = [summary.hybridizer, summary.year].filter(Boolean);

  const onShare = async () => {
    const shareData = {
      title: summary.name,
      text: `Browse ${summary.name} listings and specs.`,
      url: window.location.href,
    };

    if (navigator.share) {
      await navigator.share(shareData);
      return;
    }

    await navigator.clipboard.writeText(window.location.href);
  };

  return (
    <section id="cultivar-summary" aria-label="Cultivar summary" className="space-y-5">
      <div className="space-y-2">
        <H1 className="text-[clamp(30px,5vw,64px)]">{summary.name}</H1>

        {secondaryLineParts.length > 0 && (
          <Muted className="text-lg">({secondaryLineParts.join(", ")})</Muted>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button asChild size="lg" className="min-w-64 justify-between">
          <Link href="#offers">
            <span>
              Available from {summary.gardensCount} {summary.gardensCount === 1 ? "catalog" : "catalogs"}
            </span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>

        <Button type="button" variant="outline" size="icon" onClick={() => void onShare()}>
          <Share2 className="h-4 w-4" />
          <span className="sr-only">Share cultivar page</span>
        </Button>
      </div>
    </section>
  );
}

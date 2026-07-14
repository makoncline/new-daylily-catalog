"use client";

import Link from "next/link";
import { cn, formatAhsListingSummaryForCard } from "@/lib/utils";
import type { AhsDisplayListing } from "@/lib/utils/ahs-display";
import { OptimizedImage } from "./optimized-image";

interface CultivarCardCultivar {
  ahsListing: AhsDisplayListing | null;
  hybridizer: string | null;
  imageUrl: string | null;
  name: string;
  segment: string;
  year: string | null;
}

type CultivarCardProps = {
  cultivar: CultivarCardCultivar;
  className?: string;
  nofollow?: boolean;
  priority?: boolean;
};

export function CultivarCard({
  cultivar,
  className,
  nofollow = true,
  priority = false,
}: CultivarCardProps) {
  const cultivarUrl = `/cultivar/${cultivar.segment}`;
  const secondaryLine = [cultivar.hybridizer, cultivar.year]
    .filter(Boolean)
    .join(", ");
  const description = formatAhsListingSummaryForCard(cultivar.ahsListing);
  const titleFontSizeRem = Math.max(
    1.05,
    Math.min(2.05, 15.5 / Math.max(cultivar.name.length * 0.52, 1)),
  );

  return (
    <Link
      href={cultivarUrl}
      rel={nofollow ? "nofollow" : undefined}
      prefetch={false}
      className={cn(
        "group relative isolate flex min-h-[18rem] w-[75vw] min-w-[75vw] overflow-hidden rounded-3xl border border-[#dbe3d5] bg-[#173126] text-white shadow-[0_24px_80px_-58px_rgba(24,50,32,0.9)] transition-transform duration-300 hover:-translate-y-1 md:w-[20rem] md:min-w-[20rem]",
        className,
      )}
    >
      {cultivar.imageUrl ? (
        <OptimizedImage
          src={cultivar.imageUrl}
          alt={cultivar.name}
          size="full"
          priority={priority}
          className="absolute inset-0 aspect-auto size-full transition-transform duration-500 group-hover:scale-[1.04]"
        />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_30%,#6b8f63,#173126_62%)]" />
      )}

      <div className="absolute inset-0 bg-linear-to-t from-[#07120e]/95 via-[#07120e]/58 to-[#07120e]/18" />

      <div className="relative z-10 flex min-h-[18rem] w-full flex-col p-5">
        <div className="flex flex-1 items-center">
          <div className="w-full min-w-0">
            <h3
              className="truncate leading-none font-semibold text-white drop-shadow-lg"
              style={{ fontSize: `${titleFontSizeRem}rem` }}
              title={cultivar.name}
            >
              {cultivar.name}
            </h3>

            <p
              className={cn(
                "mt-2 min-h-5 truncate text-sm font-semibold text-white/86 drop-shadow",
                !secondaryLine && "invisible",
              )}
            >
              {secondaryLine || "Cultivar details"}
            </p>

            <p
              className={cn(
                "mt-3 line-clamp-2 min-h-12 text-sm leading-6 text-white/84",
                !description && "invisible",
              )}
            >
              {description ?? "Cultivar description"}
            </p>
          </div>
        </div>

        <div className="flex h-11 items-center justify-end text-sm font-bold text-white">
          <span className="inline-flex min-w-[8.25rem] items-center justify-center rounded-full bg-white px-4 py-2 whitespace-nowrap text-[#173126]">
            View cultivar
          </span>
        </div>
      </div>
    </Link>
  );
}

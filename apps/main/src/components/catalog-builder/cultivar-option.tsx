"use client";

import type { ComponentProps, ReactNode } from "react";
import { ImageOff } from "lucide-react";
import { OptimizedImage } from "@/components/optimized-image";
import { Button } from "@/components/ui/button";
import type { CultivarMatchCandidate } from "@/lib/catalog-importer";
import { cn } from "@/lib/utils";

export function CultivarOption({
  cultivar,
  children,
  className,
  ...props
}: Omit<ComponentProps<typeof Button>, "children"> & {
  cultivar: CultivarMatchCandidate;
  children?: ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      className={cn(
        "h-auto min-h-14 max-w-full justify-start text-left whitespace-normal",
        className,
      )}
      {...props}
    >
      <span className="bg-muted flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md">
        {cultivar.imageUrl ? (
          <OptimizedImage
            image={{
              id: cultivar.imageAsset?.id ?? cultivar.cultivarReferenceId,
              imageAsset: cultivar.imageAsset,
              url: cultivar.imageUrl,
            }}
            variant="thumb"
            size="thumbnail"
            alt=""
            className="size-full"
          />
        ) : (
          <ImageOff
            className="text-muted-foreground size-5"
            aria-hidden="true"
          />
        )}
      </span>
      <span className="flex min-w-0 flex-col gap-1">
        <span className="break-words">{cultivar.displayName}</span>
        {children ? (
          <span className="text-muted-foreground text-xs font-normal">
            {children}
          </span>
        ) : null}
      </span>
    </Button>
  );
}

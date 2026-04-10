"use client";

import Image from "next/image";
import { CheckCircle2, Link2, MapPin, Pencil, ShoppingCart } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatPrice } from "@/lib/utils";
import {
  ONBOARDING_LISTING_DEFAULTS,
  PROFILE_PLACEHOLDER_IMAGE,
} from "../onboarding-utils";

function usePreviewImageSrc({
  imageUrl,
  fallbackUrl,
}: {
  imageUrl: string;
  fallbackUrl: string;
}) {
  const [previewImageSrc, setPreviewImageSrc] = useState(fallbackUrl);
  const nextImageSrc = imageUrl.trim() || fallbackUrl;

  useEffect(() => {
    let isCancelled = false;
    const loader = new window.Image();
    loader.onload = () => {
      if (!isCancelled) {
        setPreviewImageSrc(nextImageSrc);
      }
    };
    loader.onerror = () => {
      if (!isCancelled) {
        setPreviewImageSrc(fallbackUrl);
      }
    };
    loader.src = nextImageSrc;

    return () => {
      isCancelled = true;
      loader.onload = null;
      loader.onerror = null;
    };
  }, [fallbackUrl, nextImageSrc]);

  return previewImageSrc;
}

export function OnboardingStepGrid({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn("grid gap-6", className)}>{children}</div>;
}

export function OnboardingSectionCard({
  className,
  title,
  titleClassName = "text-2xl",
  contentClassName = "space-y-6",
  children,
}: {
  className?: string;
  title: string;
  titleClassName?: string;
  contentClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className={cn("relative", className)}>
      <CardHeader>
        <CardTitle className={titleClassName}>{title}</CardTitle>
      </CardHeader>
      <CardContent className={contentClassName}>{children}</CardContent>
    </Card>
  );
}

export function HotspotButton({
  active,
  className,
  label,
  onClick,
}: {
  active: boolean;
  className?: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "border-primary/50 bg-background/95 text-primary absolute z-20 inline-flex h-6 min-w-6 items-center justify-center rounded-md border px-1.5 shadow-sm transition hover:scale-[1.03]",
        active && "bg-primary/10 ring-primary/20 ring-2",
        className,
      )}
    >
      <Pencil className="h-3.5 w-3.5" />
      <span className="sr-only">{label}</span>
    </button>
  );
}

export function PreviewBullet({ text }: { text: string }) {
  return (
    <p className="flex items-start gap-2">
      <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
      <span>{text}</span>
    </p>
  );
}

export function PreviewPlaceholderNote() {
  return (
    <p className="text-muted-foreground text-xs leading-relaxed">
      <span className="font-medium text-yellow-700">Yellow text</span> marks
      temporary sample copy shown only in this editor. It will not appear on
      your live catalog cards.
    </p>
  );
}

export function ProfilePreviewCard({
  title,
  description,
  imageUrl,
  location,
  variant = "default",
  ownershipBadge,
  footerAction,
}: {
  title: string;
  description: string;
  imageUrl: string;
  location?: string;
  variant?: "default" | "owned";
  ownershipBadge?: string;
  footerAction?: React.ReactNode;
}) {
  const previewImageSrc = usePreviewImageSrc({
    imageUrl,
    fallbackUrl: PROFILE_PLACEHOLDER_IMAGE,
  });

  return (
    <div
      className={cn(
        "bg-card w-full max-w-sm overflow-hidden rounded-2xl border",
        variant === "owned" &&
          "border-primary shadow-[0_0_0_2px_rgba(24,24,27,0.08)]",
      )}
    >
      <div className="relative aspect-square border-b">
        <Image
          src={previewImageSrc}
          alt={title}
          fill
          className="object-cover"
          unoptimized
        />
        {ownershipBadge ? (
          <Badge className="absolute top-3 left-3" variant="secondary">
            {ownershipBadge}
          </Badge>
        ) : null}
      </div>
      <div className="space-y-3 p-4">
        <p className="text-3xl leading-tight font-bold tracking-tight">
          {title}
        </p>

        {location ? (
          <Badge
            variant="secondary"
            className="inline-flex items-center gap-1 text-sm"
          >
            <MapPin className="h-3.5 w-3.5" />
            {location}
          </Badge>
        ) : null}

        <p className="text-muted-foreground text-sm leading-relaxed">
          {description}
        </p>

        {footerAction ? <div>{footerAction}</div> : null}
      </div>
    </div>
  );
}

export function ListingPreviewCard({
  title,
  description,
  price,
  linkedLabel,
  hybridizerYear,
  imageUrl,
  variant = "default",
  ownershipBadge,
}: {
  title: string;
  description: string;
  price: number | null;
  linkedLabel: string | null;
  hybridizerYear: string | null;
  imageUrl: string;
  variant?: "default" | "owned";
  ownershipBadge?: string;
}) {
  const hasDescription = description.trim().length > 0;
  const showAddToCartButton = variant === "owned" && price !== null;
  const showMetadataRow = Boolean(linkedLabel) || showAddToCartButton;
  const previewImageSrc = usePreviewImageSrc({
    imageUrl,
    fallbackUrl: ONBOARDING_LISTING_DEFAULTS.fallbackImageUrl,
  });

  return (
    <div
      className={cn(
        "bg-card w-full max-w-sm overflow-hidden rounded-xl border",
        variant === "owned" &&
          "border-primary shadow-[0_0_0_2px_rgba(24,24,27,0.08)]",
      )}
    >
      <div className="bg-muted relative aspect-square border-b">
        <Image
          src={previewImageSrc}
          alt={title}
          fill
          className="object-cover"
          sizes="(max-width: 1024px) 50vw, 280px"
          unoptimized
        />
        {price !== null ? (
          <Badge
            className="bg-background/90 absolute top-3 right-3 backdrop-blur-sm"
            variant="secondary"
          >
            {formatPrice(price)}
          </Badge>
        ) : null}
        <Badge
          className="bg-background/90 absolute right-3 bottom-3 backdrop-blur-sm"
          variant="secondary"
        >
          <Link2 className="h-3 w-3" />
        </Badge>
        {ownershipBadge ? (
          <Badge className="absolute top-3 left-3" variant="secondary">
            {ownershipBadge}
          </Badge>
        ) : null}
      </div>
      <div className="space-y-2 p-4">
        <p className="font-semibold tracking-tight">{title}</p>
        {hybridizerYear ? (
          <Badge variant="secondary" className="text-xs">
            {hybridizerYear}
          </Badge>
        ) : null}
        {hasDescription ? (
          <p className="text-muted-foreground text-sm leading-relaxed">
            {description}
          </p>
        ) : null}
        {showMetadataRow ? (
          <div className="flex items-center justify-between gap-2">
            {linkedLabel ? (
              <div className="text-muted-foreground inline-flex items-center gap-1 text-xs">
                <Link2 className="h-3.5 w-3.5" />
                {`Linked: ${linkedLabel}`}
              </div>
            ) : (
              <span />
            )}
            {showAddToCartButton ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="h-7 px-2 text-xs"
              >
                <ShoppingCart className="mr-1 h-3.5 w-3.5" />
                Add to cart
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

"use client";

import { type ComponentProps, type ReactNode } from "react";
import { Slot } from "@radix-ui/react-slot";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardTitle,
} from "@/components/ui/card";
import { ImagePlaceholder } from "@/components/image-placeholder";
import {
  OptimizedImage,
  type OptimizedImageSource,
} from "@/components/optimized-image";
import { TruncatedText } from "@/components/truncated-text";
import {
  formatListingCardTitle,
  getListingCardTitleSizeClass,
} from "@/components/listing-card-title";
import { cn, formatPrice } from "@/lib/utils";

function Root({ className, ...props }: ComponentProps<typeof Card>) {
  return (
    <Card
      data-slot="catalog-listing-card"
      className={cn(
        "group hover:border-primary relative flex h-full cursor-pointer flex-col overflow-hidden transition-all",
        className,
      )}
      {...props}
    />
  );
}

interface ActionProps extends ComponentProps<"button"> {
  asChild?: boolean;
}

function Action({
  asChild = false,
  className,
  type = "button",
  ...props
}: ActionProps) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      type={asChild ? undefined : type}
      className={cn(
        "focus-visible:ring-ring absolute inset-0 z-10 rounded-xl focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset",
        className,
      )}
      {...props}
    />
  );
}

function Media({
  alt,
  children,
  image,
  onImageError,
  priority = false,
}: {
  alt: string;
  children?: ReactNode;
  image: OptimizedImageSource | null;
  onImageError?: () => void;
  priority?: boolean;
}) {
  return (
    <div className="relative" data-slot="catalog-listing-card-media">
      {image ? (
        <OptimizedImage
          image={image}
          alt={alt}
          size="full"
          variant="display"
          priority={priority}
          className="object-cover"
          onImageError={onImageError}
        />
      ) : (
        <ImagePlaceholder />
      )}
      {children}
    </div>
  );
}

function Price({ price }: { price: number | null }) {
  if (price === null) return null;

  return (
    <div className="absolute top-2 right-2">
      <Badge variant="secondary" className="backdrop-blur-sm">
        {formatPrice(price)}
      </Badge>
    </div>
  );
}

function Content({ className, ...props }: ComponentProps<typeof CardContent>) {
  return (
    <CardContent
      className={cn("flex flex-1 flex-col gap-2 p-4", className)}
      {...props}
    />
  );
}

function Title({ title }: { title: string }) {
  const displayTitle = formatListingCardTitle(title);
  const titleWasTruncated = displayTitle !== title;

  return (
    <CardTitle>
      <h3
        className={cn(
          "break-words whitespace-normal",
          getListingCardTitleSizeClass(displayTitle.length),
        )}
        title={titleWasTruncated ? title : undefined}
      >
        {displayTitle}
      </h3>
    </CardTitle>
  );
}

function Meta({ text }: { text: string }) {
  return (
    <Badge
      variant="secondary"
      className="inline-flex w-fit max-w-full items-center gap-1"
    >
      <span className="truncate">{text}</span>
    </Badge>
  );
}

function Description({
  className,
  lines = 3,
  text,
}: {
  className?: string;
  lines?: number;
  text: string;
}) {
  if (!text) return null;

  return (
    <CardDescription>
      <TruncatedText
        text={text}
        lines={lines}
        className={cn("text-sm", className)}
      />
    </CardDescription>
  );
}

function Footer({ className, ...props }: ComponentProps<typeof CardFooter>) {
  return (
    <CardFooter
      className={cn("mt-auto justify-between p-4 pt-0", className)}
      {...props}
    />
  );
}

export const CatalogListingCard = {
  Action,
  Content,
  Description,
  Footer,
  Media,
  Meta,
  Price,
  Root,
  Title,
};

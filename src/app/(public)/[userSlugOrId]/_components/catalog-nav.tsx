"use client";

import type { MouseEvent } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  getPublicCatalogSearchPath,
  parsePositiveInteger,
} from "@/lib/public-catalog-url-state";

interface CatalogNavProps {
  canonicalUserSlug: string;
}

interface CatalogNavSection {
  name: string;
  href: string;
  isActive: boolean;
}

export interface CatalogNavViewProps {
  sections: CatalogNavSection[];
  onSectionClick: (e: MouseEvent<HTMLAnchorElement>, href: string) => void;
}

function getPageFromPathname(pathname: string | null) {
  if (!pathname) {
    return null;
  }

  const match = /\/page\/(\d+)\/?$/.exec(pathname);
  if (!match) {
    return null;
  }

  return parsePositiveInteger(match[1], 1);
}

export function useCatalogNavViewProps({
  canonicalUserSlug,
}: CatalogNavProps): CatalogNavViewProps {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const pageFromPathname = getPageFromPathname(pathname);
  const pageFromQuery = parsePositiveInteger(searchParams.get("page"), 1);
  const currentPage = pageFromPathname ?? pageFromQuery;
  const searchHref = getPublicCatalogSearchPath(canonicalUserSlug, currentPage);
  const sections = [
    {
      name: "Images",
      href: "#images",
      isActive: false,
    },
    {
      name: "About",
      href: "#about",
      isActive: false,
    },
    {
      name: "Lists",
      href: "#lists",
      isActive: false,
    },
    {
      name: "Listings",
      href: "#listings",
      isActive: false,
    },
    {
      name: "Search/filter",
      href: searchHref,
      // Keep only route-level active state for the cross-page link.
      isActive: pathname.startsWith(`/${canonicalUserSlug}/search`),
    },
  ];

  return {
    sections,
    onSectionClick: (e: MouseEvent<HTMLAnchorElement>, href: string) => {
      if (!href.startsWith("#")) {
        return;
      }

      e.preventDefault();
      const sectionId = href.replace("#", "");
      const section = document.getElementById(sectionId);
      section?.scrollIntoView({ behavior: "smooth" });
    },
  };
}

export function CatalogNavView({
  sections,
  onSectionClick,
}: CatalogNavViewProps) {
  return (
    <div className="relative">
      <ScrollArea className="max-w-[600px] lg:max-w-none">
        <div className={cn("flex items-center gap-4")}>
          {sections.map((section) => {
            return (
              <NavLink
                key={section.href}
                section={section}
                onClick={(e) => onSectionClick(e, section.href)}
              />
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" className="invisible" />
      </ScrollArea>
    </div>
  );
}

export function CatalogNav({ canonicalUserSlug }: CatalogNavProps) {
  const viewProps = useCatalogNavViewProps({ canonicalUserSlug });

  return <CatalogNavView {...viewProps} />;
}

function NavLink({
  section,
  onClick,
}: {
  section: CatalogNavSection;
  onClick: (e: MouseEvent<HTMLAnchorElement>) => void;
}) {
  return (
    <Link
      href={section.href}
      className={cn(
        "flex h-7 items-center justify-center rounded-full",
        "text-center text-sm font-medium",
        "text-muted-foreground transition-colors hover:text-primary",
        "data-[active=true]:bg-muted data-[active=true]:text-primary",
      )}
      data-active={section.isActive}
      onClick={onClick}
    >
      {section.name}
    </Link>
  );
}

export function CatalogNavSkeleton() {
  return (
    <div className="flex items-center gap-4">
      <Skeleton className="h-7 w-14" />
      <Skeleton className="h-7 w-14" />
      <Skeleton className="h-7 w-14" />
      <Skeleton className="h-7 w-14" />
      <Skeleton className="h-7 w-24" />
    </div>
  );
}

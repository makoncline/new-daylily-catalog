"use client";

import Link from "next/link";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface CatalogNavProps {
  canonicalUserSlug: string;
  currentPage: number;
}

function getCatalogSearchHref(canonicalUserSlug: string, page: number) {
  if (page > 1) {
    return `/${canonicalUserSlug}/search?page=${page}`;
  }

  return `/${canonicalUserSlug}/search`;
}

export function CatalogNav({ canonicalUserSlug, currentPage }: CatalogNavProps) {
  const searchHref = getCatalogSearchHref(canonicalUserSlug, currentPage);
  const sections = [
    {
      name: "Images",
      href: "#images",
    },
    {
      name: "About",
      href: "#about",
    },
    {
      name: "Lists",
      href: "#lists",
    },
    {
      name: "Listings",
      href: "#listings",
    },
    {
      name: "Search/filter",
      href: searchHref,
    },
  ] as const;

  const handleClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    href: string,
  ) => {
    if (!href.startsWith("#")) {
      return;
    }

    e.preventDefault();
    const sectionId = href.replace("#", "");
    const section = document.getElementById(sectionId);
    section?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="relative">
      <ScrollArea className="max-w-[600px] lg:max-w-none">
        <div className={cn("flex items-center gap-4")}>
          {sections.map((section) => {
            return (
              <NavLink
                key={section.href}
                section={section}
                isActive={false}
                onClick={(e) => handleClick(e, section.href)}
              />
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" className="invisible" />
      </ScrollArea>
    </div>
  );
}

function NavLink({
  section,
  isActive,
  onClick,
}: {
  section: { name: string; href: string };
  isActive: boolean;
  onClick: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}) {
  return (
    <Link
      href={section.href}
      className={cn(
        "flex h-7 items-center justify-center rounded-full",
        "text-center text-sm font-medium",
        "text-muted-foreground hover:text-primary transition-colors",
        "data-[active=true]:bg-muted data-[active=true]:text-primary",
      )}
      data-active={isActive}
      onClick={onClick}
    >
      {section.name}
    </Link>
  );
}

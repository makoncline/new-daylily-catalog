"use client";

import Link from "next/link";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

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
] as const;

export function CatalogNav() {
  const handleClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    href: string,
  ) => {
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
  section: (typeof sections)[number];
  isActive: boolean;
  onClick: (e: React.MouseEvent<HTMLAnchorElement>) => void;
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
      data-active={isActive}
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
    </div>
  );
}

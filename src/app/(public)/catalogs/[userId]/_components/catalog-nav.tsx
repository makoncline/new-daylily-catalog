"use client";

import Link from "next/link";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

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
  return (
    <div className="relative">
      <ScrollArea className="max-w-[600px] lg:max-w-none">
        <div className={cn("flex items-center gap-4")}>
          {sections.map((section) => {
            return (
              <NavLink key={section.href} section={section} isActive={false} />
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
}: {
  section: (typeof sections)[number];
  isActive: boolean;
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
    >
      {section.name}
    </Link>
  );
}

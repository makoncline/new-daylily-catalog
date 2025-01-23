"use client";

import Link from "next/link";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

const sections = [
  {
    name: "Profile",
    href: "#profile",
  },
  {
    name: "Images",
    href: "#images",
  },
  {
    name: "Bio",
    href: "#bio",
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
        <div className={cn("mb-4 flex items-center")}>
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
        "flex h-7 items-center justify-center rounded-full px-4",
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

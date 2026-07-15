"use client";

import Link from "next/link";

interface CatalogNavProps {
  canonicalUserSlug: string;
  currentPage: number;
}

export function CatalogNav({
  canonicalUserSlug,
  currentPage,
}: CatalogNavProps) {
  const searchHref = `/${canonicalUserSlug}/search${
    currentPage > 1 ? `?page=${currentPage}` : ""
  }`;
  const sections = [
    { name: "Images", href: "#images" },
    { name: "About", href: "#about" },
    { name: "Lists", href: "#lists" },
    { name: "Listings", href: "#listings" },
    { name: "Search/filter", href: searchHref },
  ] as const;

  return (
    <nav aria-label="Catalog sections" className="overflow-x-auto">
      <ul className="flex min-w-max items-center gap-4">
        {sections.map((section) => (
          <li key={section.href}>
            <Link
              href={section.href}
              className="text-muted-foreground hover:text-primary text-sm font-medium transition-colors"
            >
              {section.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

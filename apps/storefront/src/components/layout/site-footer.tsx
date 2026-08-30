import Link from "next/link";

export async function SiteFooter({ siteName }: { siteName: string }) {
  return (
    <footer className="bg-muted/40 border-t">
      <div className="text-muted-foreground mx-auto grid max-w-7xl gap-6 px-4 py-10 text-sm lg:grid-cols-2 lg:px-8">
        <p>
          © {new Date().getFullYear()} {siteName}. All rights reserved.
        </p>
        <nav
          className="flex flex-wrap gap-5 lg:justify-end"
          aria-label="Footer navigation"
        >
          <Link href="/catalogs">Catalogs</Link>
          <Link href="/catalog/search">Search</Link>
          <Link href="/blog">Blog</Link>
          <Link href="/contact">Contact</Link>
        </nav>
      </div>
    </footer>
  );
}

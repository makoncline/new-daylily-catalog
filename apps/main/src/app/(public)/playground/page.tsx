import type { Metadata } from "next";
import { isCatalogImporterDiscoveryEnabled } from "@/config/feature-flags";
import { TempListClient } from "./_components/temp-list-client";

export const metadata: Metadata = {
  title: "Daylily Catalog Playground",
  description:
    "Build a daylily catalog, edit listings, and download a spreadsheet or printable cards without an account.",
  alternates: { canonical: "/playground" },
  robots: isCatalogImporterDiscoveryEnabled()
    ? undefined
    : { index: false, follow: false },
};

export default async function PlaygroundPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const { checkout } = await searchParams;
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-3 py-8 lg:px-8 lg:py-12">
      <header>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Daylily Catalog Playground
        </h1>
        <p className="text-muted-foreground mt-3 max-w-3xl">
          Build, edit, and download a catalog of up to 5,000 flowers without an
          account. Your work is saved in this browser. Use Pro to import it into
          your account.
        </p>
      </header>
      {checkout === "canceled" ? (
        <p role="status">
          Checkout was canceled. Your local catalog is still here. You can
          continue editing or retry Save to my catalog.
        </p>
      ) : null}
      <TempListClient />
    </div>
  );
}

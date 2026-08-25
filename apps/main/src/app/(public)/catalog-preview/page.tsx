import type { Metadata } from "next";
import Link from "next/link";
import { CatalogPreviewClient } from "./_components/catalog-preview-client";

export const dynamic = "force-dynamic";

const GOOGLE_SHEET_ID_PATTERN = /^[A-Za-z0-9_-]{20,100}$/;
const GOOGLE_SHEET_GID_PATTERN = /^\d{1,10}$/;

interface CatalogPreviewPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function getFirstSearchParam(
  params: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export function generateMetadata(): Metadata {
  return {
    title: "Shared catalog preview | Daylily Catalog",
    description: "A read-only daylily catalog preview from a public sheet.",
    robots: {
      follow: false,
      index: false,
    },
  };
}

export default async function CatalogPreviewPage({
  searchParams,
}: CatalogPreviewPageProps) {
  const params = (await searchParams) ?? {};
  const sheetId = getFirstSearchParam(params, "sheet")?.trim() ?? "";
  const gid = getFirstSearchParam(params, "gid")?.trim();
  const requestedTitle = getFirstSearchParam(params, "title")?.trim();
  const title = requestedTitle?.length
    ? requestedTitle.slice(0, 100)
    : "Daylily catalog preview";
  const validSheet = GOOGLE_SHEET_ID_PATTERN.test(sheetId);
  const validGid = gid === undefined || GOOGLE_SHEET_GID_PATTERN.test(gid);

  if (!validSheet || !validGid) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-12 lg:py-16">
        <h1 className="text-3xl font-bold tracking-tight">
          This catalog preview link is invalid
        </h1>
        <p className="text-muted-foreground mt-3 leading-7">
          Ask the catalog owner for a new link, or make a preview from your own
          spreadsheet.
        </p>
        <Link
          href="/catalog-importer"
          className="text-primary mt-6 inline-block font-medium underline-offset-4 hover:underline"
        >
          Try your own catalog
        </Link>
      </main>
    );
  }

  return (
    <CatalogPreviewClient
      key={`${sheetId}:${gid ?? ""}`}
      gid={gid}
      sheetId={sheetId}
      title={title}
    />
  );
}

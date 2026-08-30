import type { Metadata } from "next";
import { connection } from "next/server";

import { getCatalogMetadata } from "@/app/catalog/_metadata/catalog-metadata";
import {
  CatalogPage,
  type CatalogSearchParams,
} from "@/components/catalog/catalog-page";

interface ListCatalogPageProps {
  params: Promise<{ listSlug: string }>;
  searchParams: Promise<CatalogSearchParams>;
}

export async function generateMetadata({
  params,
  searchParams,
}: ListCatalogPageProps): Promise<Metadata> {
  await connection();
  const { listSlug } = await params;
  return getCatalogMetadata({ kind: "list", listSlug, searchParams });
}

export default async function ListCatalogPage({
  params,
  searchParams,
}: ListCatalogPageProps) {
  const { listSlug } = await params;
  return (
    <CatalogPage kind="list" listSlug={listSlug} searchParams={searchParams} />
  );
}

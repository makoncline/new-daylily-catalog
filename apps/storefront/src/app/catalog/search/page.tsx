import type { Metadata } from "next";
import { connection } from "next/server";

import { getCatalogMetadata } from "@/app/catalog/_metadata/catalog-metadata";
import {
  CatalogPage,
  type CatalogSearchParams,
} from "@/components/catalog/catalog-page";

interface SearchCatalogPageProps {
  searchParams: Promise<CatalogSearchParams>;
}

export async function generateMetadata({
  searchParams,
}: SearchCatalogPageProps): Promise<Metadata> {
  await connection();
  return getCatalogMetadata({ kind: "search", searchParams });
}

export default async function SearchCatalogPage({
  searchParams,
}: SearchCatalogPageProps) {
  return <CatalogPage kind="search" searchParams={searchParams} />;
}

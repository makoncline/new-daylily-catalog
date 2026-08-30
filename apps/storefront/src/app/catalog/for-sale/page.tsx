import type { Metadata } from "next";
import { connection } from "next/server";

import { getCatalogMetadata } from "@/app/catalog/_metadata/catalog-metadata";
import {
  CatalogPage,
  type CatalogSearchParams,
} from "@/components/catalog/catalog-page";

interface ForSaleCatalogPageProps {
  searchParams: Promise<CatalogSearchParams>;
}

export async function generateMetadata({
  searchParams,
}: ForSaleCatalogPageProps): Promise<Metadata> {
  await connection();
  return getCatalogMetadata({ kind: "for-sale", searchParams });
}

export default async function ForSaleCatalogPage({
  searchParams,
}: ForSaleCatalogPageProps) {
  return <CatalogPage kind="for-sale" searchParams={searchParams} />;
}

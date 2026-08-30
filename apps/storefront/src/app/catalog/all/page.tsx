import type { Metadata } from "next";
import { connection } from "next/server";

import { getCatalogMetadata } from "@/app/catalog/_metadata/catalog-metadata";
import {
  CatalogPage,
  type CatalogSearchParams,
} from "@/components/catalog/catalog-page";

interface AllCatalogPageProps {
  searchParams: Promise<CatalogSearchParams>;
}

export async function generateMetadata({
  searchParams,
}: AllCatalogPageProps): Promise<Metadata> {
  await connection();
  return getCatalogMetadata({ kind: "all", searchParams });
}

export default async function AllCatalogPage({
  searchParams,
}: AllCatalogPageProps) {
  return <CatalogPage kind="all" searchParams={searchParams} />;
}

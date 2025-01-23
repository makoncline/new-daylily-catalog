"use server";

import { CatalogDetailClient } from "./_components/catalog-detail-client";

interface CatalogDetailPageProps {
  params: {
    userId: string;
  };
}

export default async function CatalogDetailPage({
  params,
}: CatalogDetailPageProps) {
  return <CatalogDetailClient userId={params.userId} />;
}

"use server";

import { MainContent } from "../../_components/main-content";
import { CatalogDetailClient } from "./_components/catalog-detail-client";

interface CatalogDetailPageProps {
  params: {
    userId: string;
  };
}

export default async function CatalogDetailPage({
  params,
}: CatalogDetailPageProps) {
  return (
    <MainContent>
      <CatalogDetailClient userId={params.userId} />
    </MainContent>
  );
}

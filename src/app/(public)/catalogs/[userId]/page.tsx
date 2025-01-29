"use server";

import { api } from "@/trpc/server";
import * as React from "react";
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
  void api.public.getProfile.prefetch({ userId: params.userId });
  void api.public.getListings.prefetch({ userId: params.userId });
  return (
    <MainContent>
      <CatalogDetailClient userId={params.userId} />
    </MainContent>
  );
}

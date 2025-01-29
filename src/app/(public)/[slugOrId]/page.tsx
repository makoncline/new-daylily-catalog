"use server";

import { api } from "@/trpc/server";
import { notFound } from "next/navigation";
import * as React from "react";
import { MainContent } from "../_components/main-content";
import { CatalogDetailClient } from "./_components/catalog-detail-client";

interface CatalogDetailPageProps {
  params: {
    slugOrId: string;
  };
}

export default async function CatalogDetailPage({
  params,
}: CatalogDetailPageProps) {
  return (
    <MainContent>
      <CatalogDetailClient slugOrId={params.slugOrId} />
    </MainContent>
  );
}

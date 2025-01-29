"use server";

import * as React from "react";
import { MainContent } from "../_components/main-content";
import { CatalogDetailClient } from "./_components/catalog-detail-client";
import { PublicBreadcrumbs } from "@/app/(public)/_components/public-breadcrumbs";

interface CatalogDetailPageProps {
  params: {
    userSlugOrId: string;
  };
}

export default async function CatalogDetailPage({
  params,
}: CatalogDetailPageProps) {
  return (
    <MainContent>
      <div className="mb-6">
        <PublicBreadcrumbs />
      </div>
      <CatalogDetailClient userSlugOrId={params.userSlugOrId} />
    </MainContent>
  );
}

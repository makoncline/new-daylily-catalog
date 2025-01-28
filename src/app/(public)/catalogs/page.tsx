"use server";

import { api } from "@/trpc/server";
import { CatalogsPageClient } from "./_components/catalogs-page-client";
import { MainContent } from "../_components/main-content";

export default async function CatalogsPage() {
  void api.public.getPublicProfiles.prefetch();

  return (
    <MainContent>
      <CatalogsPageClient />
    </MainContent>
  );
}

"use server";

import { api } from "@/trpc/server";
import { CatalogsPageClient } from "./_components/catalogs-page-client";

export default async function CatalogsPage() {
  void api.public.getPublicProfiles.prefetch();

  return <CatalogsPageClient />;
}

import { redirect } from "next/navigation";
import {
  createCatalogImporterCheckoutPath,
  parseCatalogImporterCheckoutSource,
} from "@/lib/catalog-importer-membership";

export const dynamic = "force-dynamic";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams?: Promise<{
    import_id?: string | string[];
    entry?: string | string[];
    return_to?: string | string[];
  }>;
} = {}) {
  const params =
    (await searchParams) ??
    ({} satisfies {
      import_id?: string | string[];
      entry?: string | string[];
      return_to?: string | string[];
    });

  const checkoutSource = parseCatalogImporterCheckoutSource(params);
  if (checkoutSource) {
    redirect(createCatalogImporterCheckoutPath(checkoutSource.importId));
  }

  redirect("/catalog-importer");
}

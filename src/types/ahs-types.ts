import type { AhsListing } from "@prisma/client";

export interface AhsSearchResult extends AhsListing {
  cultivarReferenceId: string | null;
}

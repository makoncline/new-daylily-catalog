import { describe, expect, it } from "vitest";
import { shouldUnbatchDashboardOperation } from "@/trpc/client-links";

describe("tRPC client links", () => {
  it("keeps dashboard bootstrap chunk requests out of transport batches", () => {
    expect(
      shouldUnbatchDashboardOperation({
        type: "query",
        path: "dashboardDb.bootstrap.roots",
      }),
    ).toBe(true);

    expect(
      shouldUnbatchDashboardOperation({
        type: "mutation",
        path: "dashboardDb.image.listByListingIds",
      }),
    ).toBe(true);

    expect(
      shouldUnbatchDashboardOperation({
        type: "mutation",
        path: "dashboardDb.cultivarReference.getByIdsBatch",
      }),
    ).toBe(true);
  });

  it("leaves ordinary operations on the shared batch link", () => {
    expect(
      shouldUnbatchDashboardOperation({
        type: "query",
        path: "dashboardDb.userProfile.get",
      }),
    ).toBe(false);
  });
});

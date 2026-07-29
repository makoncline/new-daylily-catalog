// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/catalog-importer/submission-sample/route";

describe("catalog importer submission sample route", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("writes one bounded structured sample log", async () => {
    const log = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const sample = {
      fileType: "xlsx",
      headerRowIndex: 0,
      importId: "import-123",
      mapping: {
        cultivarReferenceId: null,
        description: 2,
        price: 1,
        privateNote: null,
        title: 0,
      },
      resultCounts: {
        issueCount: 1,
        matchedCount: 4,
        readyCount: 3,
        reviewCount: 2,
        rowCount: 7,
        warningCount: 1,
      },
      rows: [
        {
          cells: ["Cultivar", "Price", "Description"],
          rowNumber: 1,
        },
        {
          cells: ["Vanguard", "20", "Purple bloom"],
          rowNumber: 2,
        },
      ],
      sheetCount: 1,
      sheetName: "Inventory",
      source: "upload",
    };

    const response = await POST(
      new Request("http://localhost/api/catalog-importer/submission-sample", {
        body: JSON.stringify(sample),
        headers: { "content-type": "application/json" },
        method: "POST",
      }),
    );

    expect(response.status).toBe(204);
    expect(log).toHaveBeenCalledWith(
      JSON.stringify({
        event: "catalog_importer_submission_sample",
        ...sample,
      }),
    );
  });
});

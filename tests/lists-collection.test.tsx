// tests/lists-collection.test.tsx
import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import { withTempAppDb } from "@/lib/test-utils/app-test-db";
const { useLiveQuery } = await import("@tanstack/react-db");

beforeEach(() => {
  localStorage.clear();
});

/* eslint-disable @typescript-eslint/no-explicit-any */
function ListsViewer({ listsCollection }: { listsCollection: any }) {
  const { data: items = [] } = useLiveQuery((q: any) => {
    return q
      .from({ row: listsCollection })
      .orderBy(({ row }: any) => (row.title ?? "") as string, "asc");
  });
  return (
    <div>
      <div data-testid="count">{items.length}</div>
      <div data-testid="titles">{items.map((i: any) => i.title).join(",")}</div>
      <div data-testid="ids">{items.map((i: any) => i.id).join(",")}</div>
    </div>
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */

describe("listsCollection flow: empty → insert → update → delete", () => {
  it("renders live state via useLiveQuery (no manual refetches)", async () => {
    await withTempAppDb(async () => {
      const { listsCollection, insertList, updateList, deleteList } =
        await import("@/lib/lists-collection");
      const { getTrpcClient } = await import("@/trpc/client");
      const client = getTrpcClient();

      await act(async () => {
        render(<ListsViewer listsCollection={listsCollection} />);
      });

      // starts empty
      await waitFor(() => {
        expect(screen.getByTestId("count").textContent).toBe("0");
        expect(screen.getByTestId("titles").textContent).toBe("");
        expect(screen.getByTestId("ids").textContent).toBe("");
      });

      // INSERT
      await act(async () => {
        await insertList({ title: "Alpha" });
      });
      await waitFor(() => {
        expect(screen.getByTestId("count").textContent).toBe("1");
        expect(screen.getByTestId("titles").textContent).toBe("Alpha");
      });

      // capture whatever id the UI shows now (likely temp id)
      const tempId = screen.getByTestId("ids").textContent ?? "";

      // get canonical id from the server
      const all = await client.dashboardTwo.syncLists.query({ since: null });
      const inserted = all.find((x) => x.title === "Alpha");
      expect(inserted).toBeTruthy();
      const realId = inserted!.id;

      // wait for reconciliation: real id present, temp id gone (if different)
      await waitFor(() => {
        const ids = screen.getByTestId("ids").textContent ?? "";
        expect(ids).toContain(realId);
        if (tempId && tempId !== realId) {
          expect(ids).not.toContain(tempId);
        }
      });

      // UPDATE (using canonical id)
      await act(async () => {
        await updateList({ id: realId, title: "Beta" });
      });
      await waitFor(() => {
        expect(screen.getByTestId("count").textContent).toBe("1");
        expect(screen.getByTestId("titles").textContent).toBe("Beta");
        expect(screen.getByTestId("ids").textContent).toContain(realId);
      });

      // DELETE
      await act(async () => {
        await deleteList({ id: realId });
      });
      await waitFor(() => {
        expect(screen.getByTestId("count").textContent).toBe("0");
        expect(screen.getByTestId("titles").textContent).toBe("");
        expect(screen.getByTestId("ids").textContent).toBe("");
      });
    });
  });
});

describe("listsCollection bulk inserts", () => {
  it("adds 10 lists sequentially and shows correct count", async () => {
    await withTempAppDb(async () => {
      const { listsCollection, insertList } = await import(
        "@/lib/lists-collection"
      );

      await act(async () => {
        render(<ListsViewer listsCollection={listsCollection} />);
      });

      // starts empty
      expect(screen.getByTestId("count").textContent).toBe("0");

      for (let i = 0; i < 10; i++) {
        // Insert one-by-one to simulate rapid user adds
        // and ensure reconciliation handles temp→real id swaps correctly
        await act(async () => {
          await insertList({ title: "Hello" });
        });
      }

      await waitFor(() => {
        expect(screen.getByTestId("count").textContent).toBe("10");
        const idsText = screen.getByTestId("ids").textContent ?? "";
        const ids = idsText ? idsText.split(",").filter(Boolean) : [];
        expect(new Set(ids).size).toBe(10);
      });
    });
  });
});

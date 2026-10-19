import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { TempListClient } from "@/app/(public)/temp-list/_components/temp-list-client";
import {
  TEMP_LIST_STORAGE_KEY,
  type TempPreviewRow,
} from "@/app/(public)/temp-list/_lib/temp-list";
import { resetQueryClient } from "@/trpc/query-client";

vi.mock("@/app/(public)/temp-list/_components/temp-list-preview", () => ({
  TempListPreview: ({ rows }: { rows: TempPreviewRow[] }) => (
    <ul aria-label="Saved flowers">
      {rows.map((row) => (
        <li key={row.listing.id}>{row.listing.name}</li>
      ))}
    </ul>
  ),
}));

beforeEach(async () => {
  localStorage.clear();
  await resetQueryClient();
});

afterEach(async () => {
  cleanup();
  await resetQueryClient();
  vi.unstubAllGlobals();
});

it("defaults to single search, adds a selected result without another lookup, and retains batch entry", async () => {
  const fetchMock = vi.fn<typeof fetch>().mockImplementation(async (url) => {
    if (
      typeof url === "string" &&
      url.startsWith("/api/v1/cultivars/search?")
    ) {
      return Response.json({
        results: [
          {
            cultivarReferenceId: "cr-peaches",
            name: "Millions of Peaches",
            normalizedName: "millions of peaches",
            imageAsset: null,
            imageUrl: "/peaches.jpg",
            listingSummary: { forSaleListings: 1 },
            traits: {
              hybridizer: "Smith",
              year: 2020,
              awards: [{ name: "Honorable Mention" }],
            },
          },
        ],
      });
    }
    return Response.json({ results: [] });
  });
  vi.stubGlobal("fetch", fetchMock);
  render(<TempListClient />);
  expect(screen.queryByLabelText("Cultivar names")).not.toBeInTheDocument();
  const input = screen.getByLabelText("Search cultivars");
  fireEvent.change(input, { target: { value: "mi" } });
  expect(fetchMock).not.toHaveBeenCalled();
  fireEvent.change(input, { target: { value: "millions" } });
  fireEvent.click(
    await screen.findByRole("button", { name: /Millions of Peaches Smith/ }),
  );
  expect(screen.getByRole("list", { name: "Saved flowers" })).toHaveTextContent(
    "Millions of Peaches",
  );
  expect(input).toHaveValue("");
  expect(fetchMock).toHaveBeenCalledOnce();
  const url = fetchMock.mock.calls[0]?.[0];
  expect(url).toContain("cultivarName=millions");
  expect(url).toContain("mode=summary&limit=8");
  expect(
    JSON.parse(localStorage.getItem(TEMP_LIST_STORAGE_KEY)!),
  ).toMatchObject([
    { name: "Millions of Peaches", cultivarReferenceId: "cr-peaches" },
  ]);

  fireEvent.click(screen.getByRole("radio", { name: "Input batch" }));
  fireEvent.change(screen.getByLabelText("Cultivar names"), {
    target: { value: "Goal\nDeep Impact" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Add names" }));
  await waitFor(() =>
    expect(
      screen.getByRole("list", { name: "Saved flowers" }),
    ).toHaveTextContent("Deep Impact"),
  );
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(fetchMock.mock.calls[1]?.[1]?.body).toBe(
    JSON.stringify({
      cultivarReferenceIds: [null, null],
      includeCandidates: false,
      names: ["Goal", "Deep Impact"],
    }),
  );
  fireEvent.click(screen.getByRole("radio", { name: "Single cultivar" }));
  expect(screen.getByLabelText("Search cultivars")).toHaveValue("");
  expect(JSON.parse(localStorage.getItem(TEMP_LIST_STORAGE_KEY)!)).toHaveLength(
    3,
  );
});

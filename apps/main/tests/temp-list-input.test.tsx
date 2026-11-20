import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { TempListClient } from "@/app/(public)/playground/_components/temp-list-client";
import { TempListCultivarSearch } from "@/app/(public)/playground/_components/temp-list-cultivar-search";
import {
  TEMP_LIST_STORAGE_KEY,
  type TempPreviewRow,
} from "@/app/(public)/playground/_lib/temp-list";
import { resetQueryClient } from "@/trpc/query-client";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

vi.mock("@/app/(public)/playground/_components/temp-list-preview", () => ({
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
    const names = ["Goal", "Deep Impact"];
    return Response.json({ results: names.map((name) => ({ inputName: name, exactMatch: null, candidates: [] })) });
  });
  vi.stubGlobal("fetch", fetchMock);
  render(<TempListClient />);
  expect(screen.queryByLabelText("Cultivar names")).not.toBeInTheDocument();
  const input = screen.getByLabelText("Search cultivars");
  fireEvent.change(input, { target: { value: "mi" } });
  expect(fetchMock).not.toHaveBeenCalled();
  fireEvent.change(input, { target: { value: "millions" } });
  fireEvent.click(
    await screen.findByRole("button", { name: "Add Millions of Peaches" }),
  );
  expect(input).toHaveValue("");
  expect(
    screen.queryByRole("region", { name: "Verify names" }),
  ).not.toBeInTheDocument();
  expect(screen.getByRole("list", { name: "Saved flowers" })).toHaveTextContent(
    "Millions of Peaches",
  );
  expect(fetchMock).toHaveBeenCalledOnce();
  const url = fetchMock.mock.calls[0]?.[0];
  expect(url).toContain("cultivarName=millions");
  expect(url).toContain("mode=summary&limit=8");
  expect(
    JSON.parse(localStorage.getItem(TEMP_LIST_STORAGE_KEY)!),
  ).toMatchObject([
    { name: "Millions of Peaches", cultivarReferenceId: "cr-peaches" },
  ]);

  fireEvent.mouseDown(screen.getByRole("tab", { name: "Paste names" }), {
    button: 0,
    ctrlKey: false,
  });
  fireEvent.change(screen.getByLabelText("Cultivar names"), {
    target: { value: "Goal\nDeep Impact" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Check names" }));
  const keep = await screen.findAllByRole("button", { name: "Keep unlinked" });
  keep.forEach((button) => fireEvent.click(button));
  fireEvent.click(screen.getByRole("button", { name: "Add ready" }));
  await waitFor(() =>
    expect(
      screen.getByRole("list", { name: "Saved flowers" }),
    ).toHaveTextContent("Deep Impact"),
  );
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(fetchMock.mock.calls[1]?.[1]?.body).toBe(
    JSON.stringify({
      cultivarReferenceIds: [null, null],
      includeCandidates: true,
      names: ["Goal", "Deep Impact"],
    }),
  );
  fireEvent.mouseDown(screen.getByRole("tab", { name: "Single search" }), {
    button: 0,
    ctrlKey: false,
  });
  expect(screen.getByLabelText("Search cultivars")).toHaveValue("");
  expect(JSON.parse(localStorage.getItem(TEMP_LIST_STORAGE_KEY)!)).toHaveLength(
    3,
  );
});

it("refreshes a repeated cultivar search after an empty result", async () => {
  let coffeeSearches = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>().mockImplementation(async (input) => {
      if (typeof input !== "string") throw new Error("Expected a search URL.");
      const url = new URL(input, "http://localhost");
      const found =
        url.searchParams.get("cultivarName") === "coffee fre" &&
        ++coffeeSearches > 1;
      return Response.json({
        results: found
          ? [
              {
                cultivarReferenceId: "cr-coffee-frenzy",
                name: "Coffee Frenzy",
                normalizedName: "coffee frenzy",
                imageAsset: null,
                imageUrl: null,
                listingSummary: { forSaleListings: 0 },
                traits: { awards: [] },
              },
            ]
          : [],
      });
    }),
  );
  render(<TempListCultivarSearch disabled={false} onSelect={vi.fn()} />);
  const input = screen.getByLabelText("Search cultivars");

  fireEvent.change(input, { target: { value: "coffee fre" } });
  await screen.findByText("No matches. Try another name.");
  fireEvent.change(input, { target: { value: "unknown flower" } });
  await screen.findByText("No matches. Try another name.");
  fireEvent.change(input, { target: { value: "coffee fre" } });

  expect(
    await screen.findByRole("button", { name: "Add Coffee Frenzy" }),
  ).toBeVisible();
});

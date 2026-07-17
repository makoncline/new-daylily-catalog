// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  ATLAS_FLOWS,
  confidenceCommandsForFlow,
  getAtlasFlow,
  getAtlasState,
  missingFreshStateIds,
  resolveLiveStateUrl,
  statesForFlow,
  validateAtlasFlows,
} from "../scripts/atlas-flows.mjs";
const appRoot = path.resolve(import.meta.dirname, "..");
const tempDirectories: string[] = [];
const cloneFlows = () => structuredClone(ATLAS_FLOWS);
afterEach(() =>
  tempDirectories.splice(0).forEach((dir) => rmSync(dir, { recursive: true })),
);
describe("Atlas flow contract", () => {
  it("validates the public flow and every referenced file", () => {
    expect(validateAtlasFlows({ appRoot })).toBe(true);
    expect(statesForFlow(ATLAS_FLOWS[0]!)).toHaveLength(9);
  });

  it("resolves states from independently captured flows", () => {
    const onboarding = getAtlasFlow("onboarding-membership");

    expect(onboarding.steps.map(({ title }) => title)).toEqual([
      "Understand the offer",
      "Start setup",
      "Build a profile",
      "Build an example listing",
      "Review the catalog",
      "Start the trial",
    ]);
    expect(getAtlasState("onboarding-email-empty").captureSpec).toBe(
      "tests/atlas/onboarding-membership.atlas.ts",
    );
  });

  it("declares the listing-management journey and its compact UI states", () => {
    const listings = getAtlasFlow("listing-management");

    expect(listings.steps.map(({ title }) => title)).toEqual([
      "Orient in a real catalog",
      "Find the right listings",
      "Create a listing",
      "Edit a listing",
    ]);
    expect(statesForFlow(listings)).toHaveLength(15);
  });

  it("declares the list-management journey at both supported sizes", () => {
    const lists = getAtlasFlow("list-management");

    expect(lists.steps.map(({ title }) => title)).toEqual([
      "Review catalog lists",
      "Start a collection",
      "Manage a populated collection",
      "Find a listing to add",
      "Review a removal",
    ]);
    expect(statesForFlow(lists)).toHaveLength(10);
    expect(getAtlasState("list-management-desktop-add").urlReproducible).toBe(
      false,
    );
    expect(getAtlasState("list-management-mobile-remove").urlReproducible).toBe(
      false,
    );
  });

  it("provides copy-paste confidence commands for a complete flow", () => {
    expect(confidenceCommandsForFlow(getAtlasFlow("list-management"))).toEqual([
      "pnpm main exec vitest run --maxWorkers=1 tests/manage-list-columns.test.ts tests/add-listings-combobox.test.tsx tests/dashboard-db-list-membership-sync.test.tsx tests/list-form-boundary-save.test.tsx tests/manage-list-page-membership-commit.test.tsx tests/use-list-resource.test.tsx",
      "pnpm main exec playwright test --retries=0 tests/e2e/lists-page-features.e2e.ts tests/e2e/manage-list-page-features.e2e.ts",
    ]);
  });

  it("declares the buyer inquiry journey without sending a real message", () => {
    const buyerInquiry = getAtlasFlow("buyer-inquiry");

    expect(buyerInquiry.steps.map(({ title }) => title)).toEqual([
      "Choose an item",
      "Contact the seller",
      "Review the request",
    ]);
    expect(statesForFlow(buyerInquiry)).toHaveLength(8);
  });

  it("declares the public cultivar search journey at both supported sizes", () => {
    const cultivarSearch = getAtlasFlow("cultivar-search");

    expect(cultivarSearch.steps.map(({ title }) => title)).toEqual([
      "Search the registry",
      "Refine results",
      "Inspect a cultivar",
    ]);
    expect(statesForFlow(cultivarSearch)).toHaveLength(14);
    expect(
      getAtlasState("cultivar-search-desktop-info-card").urlReproducible,
    ).toBe(false);
    expect(
      getAtlasState("cultivar-search-mobile-info-card").urlReproducible,
    ).toBe(false);
  });

  it("declares the public catalog importer journey at desktop and mobile sizes", () => {
    const importer = getAtlasFlow("catalog-importer");

    expect(importer.steps.map(({ title }) => title)).toEqual([
      "Choose a spreadsheet",
      "Map and inspect rows",
      "Resolve an uncertain match",
    ]);
    expect(statesForFlow(importer)).toHaveLength(6);
    expect(
      getAtlasState("catalog-importer-desktop-results").urlReproducible,
    ).toBe(false);
    expect(
      getAtlasState("catalog-importer-mobile-review").urlReproducible,
    ).toBe(false);
  });

  it.each([
    ["state id", "id", "Duplicate Atlas state id"],
    ["capture", "capture", "Duplicate Atlas capture"],
  ])("rejects a duplicate %s", (_label, property, message) => {
    const flows = cloneFlows();
    const states = statesForFlow(flows[0]!);
    Object.assign(states[1]!, { [property]: states[0]![property] });
    expect(() => validateAtlasFlows({ flows, appRoot })).toThrow(message);
  });

  it("rejects missing files and invalid test layers", () => {
    const missing = cloneFlows();
    missing[0]!.tests.integration[0]!.path = "tests/missing.test.ts";
    expect(() => validateAtlasFlows({ flows: missing, appRoot })).toThrow(
      "Missing referenced test: tests/missing.test.ts",
    );
    const invalid = cloneFlows();
    (invalid[0]!.tests as Record<string, unknown>).browser = [];
    expect(() => validateAtlasFlows({ flows: invalid, appRoot })).toThrow(
      "Invalid test layer: browser",
    );
  });

  it("rejects a state without a reproduction command", () => {
    const flows = cloneFlows();
    statesForFlow(flows[0]!)[0]!.reproductionCommand = "";
    expect(() => validateAtlasFlows({ flows, appRoot })).toThrow(
      "Missing reproduction command: catalog-directory",
    );
  });

  it("makes every copied reproduction command self-contained", () => {
    for (const stateItem of statesForFlow(ATLAS_FLOWS[0]!)) {
      expect(stateItem.reproductionCommand).toContain(
        "ATLAS_CAPTURE_DIR=local/atlas/reproduce/screenshots",
      );
    }
  });

  it("never publishes a live link for interaction-only state", () => {
    const pageTwo = statesForFlow(ATLAS_FLOWS[0]!).find(
      ({ id }: { id: string }) => id === "search-page-two",
    )!;
    expect(resolveLiveStateUrl(pageTwo, "http://localhost:3210")).toBeNull();
  });

  it("reports the exact missing or stale states", () => {
    const directory = mkdtempSync(path.join(os.tmpdir(), "atlas-flow-"));
    tempDirectories.push(directory);
    const [fresh, stale] = statesForFlow(ATLAS_FLOWS[0]!);
    writeFileSync(path.join(directory, fresh!.capture), "fresh");
    writeFileSync(path.join(directory, stale!.capture), "stale");
    utimesSync(path.join(directory, stale!.capture), new Date(0), new Date(0));
    const missing = missingFreshStateIds(
      {
        ...ATLAS_FLOWS[0]!,
        steps: [{ title: "test", states: [fresh!, stale!] }],
      },
      directory,
      Date.now() - 1_000,
    );
    expect(missing).toEqual([stale!.id]);
  });
});

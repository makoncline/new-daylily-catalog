// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  ATLAS_FLOWS,
  confidenceCommandsForFlow,
  getAtlasFlow,
  missingFreshStateIds,
  resolveLiveStateUrl,
  statesForFlow,
  validateAtlasFlows,
} from "../scripts/atlas-flows.mjs";
import { generateAtlasGallery } from "../scripts/generate-atlas-gallery.mjs";
const appRoot = path.resolve(import.meta.dirname, "..");
const tempDirectories: string[] = [];
const cloneFlows = () => structuredClone(ATLAS_FLOWS);
afterEach(() =>
  tempDirectories.splice(0).forEach((dir) => rmSync(dir, { recursive: true })),
);
describe("Atlas flow contract", () => {
  it("validates the flow registry and every referenced file", () => {
    expect(validateAtlasFlows({ appRoot })).toBe(true);
  });

  it("keeps the required Atlas journeys", () => {
    expect(ATLAS_FLOWS.map(({ id }) => id)).toEqual(
      expect.arrayContaining([
        "public-catalog",
        "cultivar-search",
        "catalog-importer",
        "dashboard-catalog-importer",
        "onboarding-membership",
        "dashboard-home",
        "profile-management",
        "listing-management",
        "tag-printing",
        "listing-media",
        "list-management",
        "buyer-inquiry",
      ]),
    );
  });

  it("routes confidence commands to the right test runners", () => {
    const commands = confidenceCommandsForFlow(getAtlasFlow("list-management"));

    expect(commands).toHaveLength(3);
    expect(commands[0]).toMatch(/^pnpm main exec vitest run --maxWorkers=1 /);
    expect(commands[0]).not.toContain("tests/integration/");
    expect(commands[1]).toMatch(
      /^node apps\/main\/scripts\/run-integration-local\.mjs tests\/integration\//,
    );
    expect(commands[2]).toMatch(
      /^pnpm main exec playwright test --retries=0 tests\/e2e\//,
    );
  });

  it.each([
    ["dashboard-catalog-importer", ["dashboard-imports"]],
    ["profile-management", ["profile-workflow"]],
    ["listing-management", ["editor-save", "surface-history"]],
    ["list-management", ["editor-save", "surface-history"]],
    ["tag-printing", ["tags-search"]],
  ])("keeps %s reference checks reachable", (flowId, testNames) => {
    const flow = getAtlasFlow(flowId);
    expect(flow.implementation?.entryPoints.length).toBeGreaterThan(0);
    expect(flow.implementation?.invariants.length).toBeGreaterThan(0);
    const commands = confidenceCommandsForFlow(flow);
    const fullAppCommand = commands.find((command) =>
      command?.startsWith("node apps/main/scripts/run-integration-local.mjs "),
    );
    for (const testName of testNames) {
      const testPath = `tests/integration/${testName}.integration.ts`;
      expect(fullAppCommand?.split(" ")).toContain(testPath);
      expect(
        commands.filter((command) => command !== fullAppCommand).join(" "),
      ).not.toContain(testPath);
    }
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

  it("rejects broken implementation links", () => {
    const missingSource = cloneFlows();
    missingSource[0]!.implementation!.entryPoints[0]!.path =
      "src/server/db/missing-read-model.ts";
    expect(() => validateAtlasFlows({ flows: missingSource, appRoot })).toThrow(
      "Missing implementation entry point: src/server/db/missing-read-model.ts",
    );
  });

  it("links a flow to its source and behavioral tests", () => {
    const directory = mkdtempSync(path.join(os.tmpdir(), "atlas-gallery-"));
    tempDirectories.push(directory);
    const flow = getAtlasFlow("public-catalog");
    const screenshots = path.join(directory, "screenshots");
    mkdirSync(screenshots);
    for (const stateItem of statesForFlow(flow)) {
      writeFileSync(path.join(screenshots, stateItem.capture), "capture");
    }

    const html = readFileSync(
      generateAtlasGallery({
        flowId: flow.id,
        outputDirectory: directory,
      }),
      "utf8",
    );
    expect(html).toContain("Profile page data");
    const sourceLink = /href="([^"]*public-profile-route\.ts)"/.exec(html)?.[1];
    expect(sourceLink).toBeDefined();
    expect(path.resolve(directory, decodeURIComponent(sourceLink!))).toBe(
      path.join(
        appRoot,
        "src/app/(public)/[userSlugOrId]/_lib/public-profile-route.ts",
      ),
    );
    expect(html).toContain("Read public data through the replica");
    expect(html).toContain("tests/public-profile-route.test.ts");
  });

  it("rejects a state without a reproduction command", () => {
    const flows = cloneFlows();
    statesForFlow(flows[0]!)[0]!.reproductionCommand = "";
    expect(() => validateAtlasFlows({ flows, appRoot })).toThrow(
      "Missing reproduction command: catalog-directory",
    );
  });

  it("routes every copied reproduction command through its managed flow", () => {
    for (const flow of ATLAS_FLOWS) {
      for (const stateItem of statesForFlow(flow)) {
        expect(stateItem.reproductionCommand).toBe(
          `node apps/main/scripts/run-atlas-flow.mjs ${flow.id} --output=local/atlas/reproduce`,
        );
      }
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

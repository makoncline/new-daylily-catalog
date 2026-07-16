// @ts-nocheck -- Directly executable Node registry, contract-tested by Vitest.
import { existsSync, statSync } from "node:fs";
import path from "node:path";
const CAPTURE_SPEC = "tests/atlas/public-catalog.atlas.ts";
const reproduce = (title) =>
  `ATLAS_OUTPUT_DIR=local/atlas/reproduce ATLAS_CAPTURE_DIR=local/atlas/reproduce/screenshots pnpm main exec playwright test -c playwright.atlas.config.ts tests/atlas/public-catalog.atlas.ts --grep "${title}"`;
const state = (id, title, description, url, urlReproducible = true) => ({
  id,
  title,
  description,
  capture: `${id}.png`,
  captureSpec: CAPTURE_SPEC,
  reproductionCommand: reproduce(title),
  url,
  urlReproducible,
});
const testRef = (layer, file) => ({
  path: file,
  command:
    layer === "e2e"
      ? `pnpm main exec playwright test ${file}`
      : `pnpm main exec vitest run ${file}`,
});
export const ATLAS_FLOWS = [
  {
    id: "public-catalog",
    audience: "public",
    title: "Browse a public catalog",
    description:
      "Find a grower, search a production-sized catalog, and inspect a listing.",
    tests: {
      unit: [],
      integration: [
        testRef("integration", "tests/get-public-listings.test.ts"),
        testRef(
          "integration",
          "tests/public-catalog-search-persistence.test.ts",
        ),
        testRef("integration", "tests/public-catalog-url-state.test.ts"),
      ],
      e2e: [
        testRef("e2e", "tests/e2e/public-catalog-advanced-search.e2e.ts"),
        testRef("e2e", "tests/e2e/cultivar-page-flow.e2e.ts"),
        testRef("e2e", "tests/e2e/smoke.e2e.ts"),
      ],
    },
    steps: [
      {
        title: "Find a grower",
        states: [
          state(
            "catalog-directory",
            "Catalog directory",
            "Public directory with realistic grower profiles and listing counts.",
            "/catalogs",
          ),
          state(
            "populated-catalog",
            "Populated catalog",
            "A real grower profile with navigation, lists, images, and listings.",
            "/plantfancygardens",
          ),
        ],
      },
      {
        title: "Search and filter",
        states: [
          state(
            "search-results",
            "Search results",
            "A buyer query narrowed to a matching listing.",
            "/rollingoaksdaylilies/search?query=Absolute%20Ripper",
          ),
          state(
            "advanced-filters",
            "Advanced filters",
            "The complete advanced filter surface with active sale/photo filters.",
            "/rollingoaksdaylilies/search?mode=advanced&price=true&hasPhoto=true",
          ),
          state(
            "no-results",
            "No results",
            "Search feedback when no listing matches the buyer query.",
            "/rollingoaksdaylilies/search?query=no-such-daylily",
          ),
        ],
      },
      {
        title: "Browse results",
        states: [
          state(
            "search-page-two",
            "Search page two",
            "The second page at the search table's smallest default size of 12.",
            "/rollingoaksdaylilies/search",
            false,
          ),
        ],
      },
      {
        title: "Inspect a listing",
        states: [
          state(
            "listing-detail",
            "Listing detail",
            "A public listing with seller actions, cultivar data, and gallery.",
            "/plantfancygardens/woodside-debutante",
          ),
          state(
            "listing-alternate-image",
            "Alternate listing image",
            "Listing detail after the buyer chooses another gallery thumbnail.",
            "/plantfancygardens/woodside-debutante",
            false,
          ),
          state(
            "listing-unavailable",
            "Unavailable listing",
            "The public not-found state for a missing or unavailable listing.",
            "/plantfancygardens/not-a-real-listing",
          ),
        ],
      },
    ],
  },
];
export const statesForFlow = (flow) =>
  flow.steps.flatMap((step) => step.states);
export function getAtlasFlow(flowId, flows = ATLAS_FLOWS) {
  const flow = flows.find(({ id }) => id === flowId);
  if (!flow) throw new Error(`Unknown Atlas flow: ${flowId}`);
  return flow;
}
export function getAtlasState(stateId, flow = ATLAS_FLOWS[0]) {
  const found = statesForFlow(flow).find(({ id }) => id === stateId);
  if (!found) throw new Error(`Unknown Atlas state: ${stateId}`);
  return found;
}
export function resolveLiveStateUrl(stateItem, baseURL) {
  return stateItem.urlReproducible && stateItem.url
    ? new URL(stateItem.url, baseURL).toString()
    : null;
}
export function validateAtlasFlows({ flows = ATLAS_FLOWS, appRoot }) {
  const stateIds = new Set();
  const captures = new Set();
  const allowedLayers = new Set(["unit", "integration", "e2e"]);
  for (const flow of flows) {
    for (const layer of Object.keys(flow.tests)) {
      if (!allowedLayers.has(layer))
        throw new Error(`Invalid test layer: ${layer}`);
    }
    for (const references of Object.values(flow.tests)) {
      for (const reference of references) {
        if (!existsSync(path.resolve(appRoot, reference.path)))
          throw new Error(`Missing referenced test: ${reference.path}`);
      }
    }
    for (const stateItem of statesForFlow(flow)) {
      if (stateIds.has(stateItem.id))
        throw new Error(`Duplicate Atlas state id: ${stateItem.id}`);
      if (captures.has(stateItem.capture))
        throw new Error(`Duplicate Atlas capture: ${stateItem.capture}`);
      if (!stateItem.reproductionCommand)
        throw new Error(`Missing reproduction command: ${stateItem.id}`);
      if (!existsSync(path.resolve(appRoot, stateItem.captureSpec)))
        throw new Error(`Missing capture spec: ${stateItem.captureSpec}`);
      stateIds.add(stateItem.id);
      captures.add(stateItem.capture);
    }
  }
  return true;
}
export function missingFreshStateIds(flow, captureDirectory, startedAt) {
  return statesForFlow(flow)
    .filter(({ capture }) => {
      const file = path.join(captureDirectory, capture);
      return !existsSync(file) || statSync(file).mtimeMs < startedAt;
    })
    .map(({ id }) => id);
}

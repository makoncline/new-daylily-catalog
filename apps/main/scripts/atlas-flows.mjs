// @ts-nocheck -- Directly executable Node registry, contract-tested by Vitest.
import { existsSync, statSync } from "node:fs";
import path from "node:path";
const stateFor =
  (captureSpec) =>
  (id, title, description, url, urlReproducible = true) => ({
    id,
    title,
    description,
    capture: `${id}.png`,
    captureSpec,
    reproductionCommand: `ATLAS_OUTPUT_DIR=local/atlas/reproduce ATLAS_CAPTURE_DIR=local/atlas/reproduce/screenshots pnpm main exec playwright test -c playwright.atlas.config.ts ${captureSpec} --grep "${title}"`,
    url,
    urlReproducible,
  });
const publicState = stateFor("tests/atlas/public-catalog.atlas.ts");
const onboardingState = stateFor("tests/atlas/onboarding-membership.atlas.ts");
const listingState = stateFor("tests/atlas/listing-management.atlas.ts");
const buyerState = stateFor("tests/atlas/buyer-inquiry.atlas.ts");
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
          publicState(
            "catalog-directory",
            "Catalog directory",
            "Public directory with realistic grower profiles and listing counts.",
            "/catalogs",
          ),
          publicState(
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
          publicState(
            "search-results",
            "Search results",
            "A buyer query narrowed to a matching listing.",
            "/rollingoaksdaylilies/search?query=Absolute%20Ripper",
          ),
          publicState(
            "advanced-filters",
            "Advanced filters",
            "The complete advanced filter surface with active sale/photo filters.",
            "/rollingoaksdaylilies/search?mode=advanced&price=true&hasPhoto=true",
          ),
          publicState(
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
          publicState(
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
          publicState(
            "listing-detail",
            "Listing detail",
            "A public listing with seller actions, cultivar data, and gallery.",
            "/plantfancygardens/woodside-debutante",
          ),
          publicState(
            "listing-alternate-image",
            "Alternate listing image",
            "Listing detail after the buyer chooses another gallery thumbnail.",
            "/plantfancygardens/woodside-debutante",
            false,
          ),
          publicState(
            "listing-unavailable",
            "Unavailable listing",
            "The public not-found state for a missing or unavailable listing.",
            "/plantfancygardens/not-a-real-listing",
          ),
        ],
      },
    ],
  },
  {
    id: "onboarding-membership",
    audience: "member",
    title: "Create a catalog and start membership",
    description:
      "Understand the grower offer, build a catalog preview, and reach the trial handoff.",
    tests: {
      unit: [
        testRef("unit", "tests/anonymous-onboarding-draft.test.ts"),
        testRef("unit", "tests/anonymous-onboarding-config.test.ts"),
      ],
      integration: [
        testRef("integration", "tests/anonymous-onboarding-layout.test.tsx"),
        testRef("integration", "tests/onboarding-router.test.ts"),
      ],
      e2e: [testRef("e2e", "tests/e2e/onboarding-full-flow.e2e.ts")],
    },
    steps: [
      {
        title: "Understand the offer",
        states: [
          onboardingState(
            "onboarding-membership-offer",
            "Membership offer",
            "The public grower offer before setup begins.",
            "/start-membership",
          ),
        ],
      },
      {
        title: "Start setup",
        states: [
          onboardingState(
            "onboarding-email-empty",
            "Email empty",
            "The initial setup state before an account email is entered.",
            "/onboarding?step=email",
          ),
          onboardingState(
            "onboarding-email-invalid",
            "Email invalid",
            "An incomplete email keeps progression unavailable.",
            "/onboarding?step=email",
            false,
          ),
          onboardingState(
            "onboarding-email-valid",
            "Email valid",
            "A valid account email makes setup ready to continue.",
            "/onboarding?step=email",
            false,
          ),
        ],
      },
      {
        title: "Build a profile",
        states: [
          onboardingState(
            "onboarding-profile-default",
            "Profile defaults",
            "The starter profile and live catalog-card preview.",
            "/onboarding?step=profile",
            false,
          ),
          onboardingState(
            "onboarding-profile-custom",
            "Profile customized",
            "Realistic seller details with an alternate starter image.",
            "/onboarding?step=profile",
            false,
          ),
          onboardingState(
            "onboarding-profile-upload",
            "Profile upload",
            "The visible image upload dropzone before a file is selected.",
            "/onboarding?step=profile",
            false,
          ),
          onboardingState(
            "onboarding-profile-crop",
            "Profile crop",
            "The real crop dialog after selecting a profile image.",
            "/onboarding?step=profile",
            false,
          ),
        ],
      },
      {
        title: "Build an example listing",
        states: [
          onboardingState(
            "onboarding-listing-default",
            "Listing defaults",
            "The initial example listing with generated placeholder content.",
            "/onboarding?step=listing",
            false,
          ),
          onboardingState(
            "onboarding-listing-custom",
            "Listing customized",
            "A selected cultivar with realistic title, price, and description.",
            "/onboarding?step=listing",
            false,
          ),
          onboardingState(
            "onboarding-listing-upload",
            "Listing upload",
            "The visible listing-image upload dropzone.",
            "/onboarding?step=listing",
            false,
          ),
          onboardingState(
            "onboarding-listing-crop",
            "Listing crop",
            "The real crop dialog after selecting a listing image.",
            "/onboarding?step=listing",
            false,
          ),
        ],
      },
      {
        title: "Review the catalog",
        states: [
          onboardingState(
            "onboarding-catalog-preview",
            "Catalog preview",
            "The completed seller and example-listing preview before membership.",
            "/onboarding?step=preview",
            false,
          ),
        ],
      },
      {
        title: "Start the trial",
        states: [
          onboardingState(
            "onboarding-checkout-review",
            "Checkout review",
            "The account email and membership terms immediately before Stripe.",
            "/onboarding?step=checkout",
            false,
          ),
        ],
      },
    ],
  },
  {
    id: "listing-management",
    audience: "member",
    title: "Find, create, and edit listings",
    description:
      "Manage a production-shaped catalog through the same dashboard controls members use.",
    tests: {
      unit: [testRef("unit", "tests/listings-search-normalization.test.tsx")],
      integration: [
        testRef(
          "integration",
          "tests/dashboard-listing-filter-toolbar.test.ts",
        ),
        testRef("integration", "tests/listings-table-filter-columns.test.tsx"),
        testRef("integration", "tests/create-listing-dialog.test.tsx"),
        testRef("integration", "tests/listing-dialog-query-state.test.tsx"),
        testRef("integration", "tests/edit-listing-dialog-url-sync.test.tsx"),
      ],
      e2e: [
        testRef("e2e", "tests/e2e/listings-page-features.e2e.ts"),
        testRef("e2e", "tests/e2e/create-edit-listing-flow.e2e.ts"),
      ],
    },
    steps: [
      {
        title: "Orient in a real catalog",
        states: [
          listingState(
            "listing-management-table",
            "Listings table",
            "A compact page of a production-sized member catalog.",
            "/dashboard/listings?size=10",
          ),
          listingState(
            "listing-management-row-actions",
            "Listing row actions",
            "The visible actions available for an existing listing.",
            "/dashboard/listings?size=10",
            false,
          ),
        ],
      },
      {
        title: "Find the right listings",
        states: [
          listingState(
            "listing-management-query",
            "Listing search",
            "A member query narrowed to matching catalog rows.",
            "/dashboard/listings?size=10&query=Richfield%20Muriel",
          ),
          listingState(
            "listing-management-advanced",
            "Advanced listing search",
            "The detailed field-by-field search controls.",
            "/dashboard/listings?size=10",
            false,
          ),
          listingState(
            "listing-management-for-sale",
            "For sale filter",
            "The catalog narrowed to listings currently offered for sale.",
            "/dashboard/listings?size=10",
            false,
          ),
          listingState(
            "listing-management-list-filter",
            "List filter choices",
            "The member's real lists available as listing filters.",
            "/dashboard/listings?size=10",
            false,
          ),
          listingState(
            "listing-management-sort",
            "Sorted listings",
            "The table sorted through its visible Title column control.",
            "/dashboard/listings?size=10",
            false,
          ),
          listingState(
            "listing-management-page-two",
            "Listings page two",
            "The next compact page in a production-sized catalog.",
            "/dashboard/listings?size=10&page=2",
          ),
          listingState(
            "listing-management-no-results",
            "No matching listings",
            "Clear feedback when no member listing matches a query.",
            "/dashboard/listings?size=10&query=no-such-member-listing",
          ),
        ],
      },
      {
        title: "Create a listing",
        states: [
          listingState(
            "listing-management-create-empty",
            "Create listing",
            "The empty listing dialog before selecting a cultivar.",
            "/dashboard/listings?size=10",
            false,
          ),
          listingState(
            "listing-management-cultivar-picker",
            "Cultivar picker results",
            "Real AHS cultivar matches inside the listing creation flow.",
            "/dashboard/listings?size=10",
            false,
          ),
          listingState(
            "listing-management-create-selected",
            "Cultivar selected",
            "A create form populated from a selected cultivar without saving it.",
            "/dashboard/listings?size=10",
            false,
          ),
        ],
      },
      {
        title: "Edit a listing",
        states: [
          listingState(
            "listing-management-edit-populated",
            "Edit populated listing",
            "An existing real listing with images, status, notes, and linked data.",
            "/dashboard/listings?size=10",
            false,
          ),
          listingState(
            "listing-management-edit-validation",
            "Empty required listing name",
            "The current edit state after clearing the required name, before saving.",
            "/dashboard/listings?size=10",
            false,
          ),
          listingState(
            "listing-management-list-picker",
            "Listing membership picker",
            "The real lists available while editing a listing.",
            "/dashboard/listings?size=10",
            false,
          ),
        ],
      },
    ],
  },
  {
    id: "buyer-inquiry",
    audience: "public",
    title: "Choose a listing and contact its seller",
    description:
      "Build a request from a realistically priced listing and review every pre-submit contact state without sending a real message.",
    tests: {
      unit: [testRef("unit", "tests/use-cart.test.tsx")],
      integration: [
        testRef("integration", "tests/contact-form.test.tsx"),
        testRef("integration", "tests/public-inquiry.test.ts"),
        testRef("integration", "tests/public-inquiry-rate-limit.test.ts"),
        testRef("integration", "tests/public-router-send-message.test.ts"),
      ],
      e2e: [],
    },
    steps: [
      {
        title: "Choose an item",
        states: [
          buyerState(
            "buyer-priced-listing",
            "Priced listing",
            "A real public listing with price, images, seller contact, and cart action.",
            "/starcrossedseeds/unpredictable",
          ),
          buyerState(
            "buyer-item-added",
            "Item added to cart",
            "The listing immediately after its visible cart action succeeds.",
            "/starcrossedseeds/unpredictable",
            false,
          ),
        ],
      },
      {
        title: "Contact the seller",
        states: [
          buyerState(
            "buyer-contact-empty",
            "Message-only contact form",
            "The seller contact dialog before the buyer adds an item.",
            "/starcrossedseeds/unpredictable",
            false,
          ),
          buyerState(
            "buyer-contact-cart",
            "Contact form with cart",
            "The request dialog with one realistically priced listing and subtotal.",
            "/starcrossedseeds/unpredictable",
            false,
          ),
          buyerState(
            "buyer-cart-quantity",
            "Adjusted cart quantity",
            "The request after the buyer increases the listing quantity.",
            "/starcrossedseeds/unpredictable",
            false,
          ),
        ],
      },
      {
        title: "Review the request",
        states: [
          buyerState(
            "buyer-cart-removed",
            "Cart item removed",
            "The contact form after removing the only requested listing.",
            "/starcrossedseeds/unpredictable",
            false,
          ),
          buyerState(
            "buyer-email-invalid",
            "Invalid contact email",
            "Inline validation for an invalid buyer email address.",
            "/starcrossedseeds/unpredictable",
            false,
          ),
          buyerState(
            "buyer-ready-to-send",
            "Message ready to send",
            "A valid message-only inquiry ready for submission, without sending it.",
            "/starcrossedseeds/unpredictable",
            false,
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
export function getAtlasState(stateId, flow) {
  const found = (flow ? [flow] : ATLAS_FLOWS)
    .flatMap(statesForFlow)
    .find(({ id }) => id === stateId);
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

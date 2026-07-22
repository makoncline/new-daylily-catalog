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
const cultivarState = stateFor("tests/atlas/cultivar-search.atlas.ts");
const importerState = stateFor("tests/atlas/catalog-importer.atlas.ts");
const dashboardImporterState = stateFor(
  "tests/atlas/dashboard-catalog-importer.atlas.ts",
);
const onboardingState = stateFor("tests/atlas/onboarding-membership.atlas.ts");
const listingState = stateFor("tests/atlas/listing-management.atlas.ts");
const listingMediaState = stateFor("tests/atlas/listing-media.atlas.ts");
const listState = stateFor("tests/atlas/list-management.atlas.ts");
const tagState = stateFor("tests/atlas/tag-printing.atlas.ts");
const buyerState = stateFor("tests/atlas/buyer-inquiry.atlas.ts");
const profileState = stateFor("tests/atlas/profile-management.atlas.ts");
const testRef = (layer, file) => ({
  path: file,
  runner: layer === "e2e" ? "e2e" : "vitest",
  command:
    layer === "e2e"
      ? `pnpm main exec playwright test ${file}`
      : `pnpm main exec vitest run ${file}`,
});
const fullAppIntegrationRef = (file) => ({
  path: file,
  runner: "full-app-integration",
  command: `node apps/main/scripts/run-integration-local.mjs ${file}`,
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
    id: "cultivar-search",
    audience: "public",
    title: "Search and inspect registered cultivars",
    description:
      "Search the production-shaped cultivar registry, refine the results, and inspect a cultivar at mobile and desktop sizes.",
    tests: {
      unit: [],
      integration: [
        testRef("integration", "tests/cultivar-search-page-client.test.tsx"),
        testRef("integration", "tests/cultivar-search-route.test.ts"),
        testRef("integration", "tests/cultivar-search-facets-route.test.ts"),
        testRef("integration", "tests/cultivar-search.integration.test.ts"),
      ],
      e2e: [testRef("e2e", "tests/e2e/cultivar-page-flow.e2e.ts")],
    },
    steps: [
      {
        title: "Search the registry",
        states: [
          cultivarState(
            "cultivar-search-desktop-base",
            "Desktop cultivar browse",
            "The unfiltered initial registry batch at the iPad-width desktop size.",
            "/cultivars",
          ),
          cultivarState(
            "cultivar-search-mobile-base",
            "Mobile cultivar browse",
            "The unfiltered initial registry batch at the phone-width mobile size.",
            "/cultivars",
          ),
          cultivarState(
            "cultivar-search-desktop-results",
            "Desktop cultivar results",
            "A selective real-data search at the iPad-width desktop size.",
            "/cultivars?q=Coffee%20Frenzy",
          ),
          cultivarState(
            "cultivar-search-mobile-results",
            "Mobile cultivar results",
            "The same selective search at the phone-width mobile size.",
            "/cultivars?q=Coffee%20Frenzy",
          ),
          cultivarState(
            "cultivar-search-desktop-empty",
            "Desktop no results",
            "Clear recovery guidance for a query with no matching cultivar.",
            "/cultivars?q=no-such-daylily-cultivar",
          ),
          cultivarState(
            "cultivar-search-mobile-empty",
            "Mobile no results",
            "The no-results recovery state at the phone-width mobile size.",
            "/cultivars?q=no-such-daylily-cultivar",
          ),
        ],
      },
      {
        title: "Refine results",
        states: [
          cultivarState(
            "cultivar-search-desktop-advanced",
            "Desktop advanced cultivar filters",
            "All advanced registry controls with one realistic result.",
            "/cultivars?advanced=true&q=Coffee%20Frenzy",
          ),
          cultivarState(
            "cultivar-search-mobile-advanced",
            "Mobile advanced cultivar filters",
            "The first collapsible advanced-filter group open on mobile.",
            "/cultivars?advanced=true&q=Coffee%20Frenzy",
          ),
          cultivarState(
            "cultivar-search-desktop-filtered",
            "Desktop photo-filtered cultivars",
            "A realistic search with the visible photo filter active.",
            "/cultivars?hasCultivarPhoto=true&q=Coffee%20Frenzy",
          ),
          cultivarState(
            "cultivar-search-mobile-filtered",
            "Mobile photo-filtered cultivars",
            "The same active filter and result at the phone-width mobile size.",
            "/cultivars?hasCultivarPhoto=true&q=Coffee%20Frenzy",
          ),
        ],
      },
      {
        title: "Inspect a cultivar",
        states: [
          cultivarState(
            "cultivar-search-desktop-info-card",
            "Desktop cultivar info card",
            "The detailed registry popover opened from a search result at the iPad-width desktop size.",
            "/cultivars?q=Coffee%20Frenzy",
            false,
          ),
          cultivarState(
            "cultivar-search-mobile-info-card",
            "Mobile cultivar info card",
            "The same detailed registry popover opened from a search result at the phone-width mobile size.",
            "/cultivars?q=Coffee%20Frenzy",
            false,
          ),
          cultivarState(
            "cultivar-search-desktop-detail",
            "Desktop cultivar detail",
            "The canonical cultivar page at the iPad-width desktop size.",
            "/cultivar/coffee-frenzy",
          ),
          cultivarState(
            "cultivar-search-mobile-detail",
            "Mobile cultivar detail",
            "The canonical cultivar page at the phone-width mobile size.",
            "/cultivar/coffee-frenzy",
          ),
        ],
      },
    ],
  },
  {
    id: "catalog-importer",
    audience: "public",
    title: "Prepare a daylily catalog spreadsheet",
    description:
      "Start from a spreadsheet, link registered cultivars, resolve catalog issues, preview the catalog, and download the prepared workbook.",
    tests: {
      unit: [],
      integration: [
        testRef("integration", "tests/catalog-importer.test.ts"),
        testRef("integration", "tests/catalog-importer-draft.test.ts"),
        testRef("integration", "tests/catalog-importer-workbench.test.tsx"),
      ],
      e2e: [testRef("e2e", "tests/e2e/catalog-importer.e2e.ts")],
    },
    steps: [
      {
        title: "Start from a spreadsheet",
        states: [
          importerState(
            "catalog-importer-desktop-upload",
            "Desktop catalog upload",
            "The spreadsheet starting point for catalog preparation on desktop.",
            "/catalog-importer",
          ),
          importerState(
            "catalog-importer-mobile-upload",
            "Mobile catalog upload",
            "The same upload state at phone width.",
            "/catalog-importer",
          ),
          importerState(
            "catalog-importer-desktop-mapping",
            "Desktop column mapping",
            "The source spreadsheet preview and compact field mapping before processing.",
            "/catalog-importer",
            false,
          ),
        ],
      },
      {
        title: "Reveal the prepared catalog",
        states: [
          importerState(
            "catalog-importer-desktop-results",
            "Desktop catalog results",
            "The personalized enrichment reveal, preparation status, and complete results workspace.",
            "/catalog-importer",
            false,
          ),
          importerState(
            "catalog-importer-mobile-results",
            "Mobile catalog results",
            "The personalized reveal and persistent preparation actions at phone width.",
            "/catalog-importer",
            false,
          ),
          importerState(
            "catalog-importer-desktop-details",
            "Cultivar details sheet",
            "A preview listing opened with the shared Daylily Database display.",
            "/catalog-importer",
            false,
          ),
        ],
      },
      {
        title: "Resolve uncertain matches",
        states: [
          importerState(
            "catalog-importer-desktop-review",
            "Desktop catalog review",
            "The source spreadsheet row and focused registered-cultivar decision workspace.",
            "/catalog-importer",
            false,
          ),
          importerState(
            "catalog-importer-mobile-review",
            "Mobile catalog review",
            "The phone-width source context and side-by-side candidate choice.",
            "/catalog-importer",
            false,
          ),
          importerState(
            "catalog-importer-desktop-review-complete",
            "Cultivar review complete",
            "The compact outcome after the final uncertain name is resolved.",
            "/catalog-importer",
            false,
          ),
        ],
      },
      {
        title: "Repair spreadsheet data",
        states: [
          importerState(
            "catalog-importer-desktop-issues",
            "Desktop spreadsheet issues",
            "Duplicate and price decisions shown in spreadsheet-shaped tables.",
            "/catalog-importer",
            false,
          ),
          importerState(
            "catalog-importer-mobile-issues",
            "Mobile spreadsheet issues",
            "The same repair work at phone width without clipped controls.",
            "/catalog-importer",
            false,
          ),
        ],
      },
      {
        title: "Preview the catalog",
        states: [
          importerState(
            "catalog-importer-desktop-preview",
            "Desktop catalog preview",
            "The customer-facing cards, full shared search panel, and collection analysis.",
            "/catalog-importer",
            false,
          ),
          importerState(
            "catalog-importer-mobile-preview",
            "Mobile catalog preview",
            "The searchable cards, advanced filters, and persistent preparation actions at phone width.",
            "/catalog-importer",
            false,
          ),
        ],
      },
      {
        title: "Download the prepared spreadsheet",
        states: [
          importerState(
            "catalog-importer-desktop-download",
            "Desktop spreadsheet download",
            "Both prepared workbook choices with their exact output boundaries.",
            "/catalog-importer",
            false,
          ),
          importerState(
            "catalog-importer-mobile-download",
            "Mobile spreadsheet download",
            "The prepared workbook choices at phone width without clipped actions.",
            "/catalog-importer",
            false,
          ),
          importerState(
            "catalog-importer-desktop-download-confirm",
            "Incomplete download confirmation",
            "The explicit remaining-work confirmation before an early download.",
            "/catalog-importer",
            false,
          ),
        ],
      },
    ],
  },
  {
    id: "dashboard-catalog-importer",
    audience: "member",
    title: "Create listings from a prepared catalog",
    description:
      "Resume or start a spreadsheet import, review the create-only listing set, and inspect row data before committing database writes.",
    tests: {
      unit: [],
      integration: [
        testRef("integration", "tests/dashboard-import-table.test.tsx"),
        testRef(
          "integration",
          "tests/dashboard-import-existing-listings.test.tsx",
        ),
        testRef("integration", "tests/dashboard-import-start-over.test.tsx"),
      ],
      e2e: [testRef("e2e", "tests/e2e/catalog-importer.e2e.ts")],
    },
    steps: [
      {
        title: "Start or resume",
        states: [
          dashboardImporterState(
            "dashboard-importer-start",
            "Dashboard importer start",
            "The signed-in upload starting point with the dashboard page context intact.",
            "/dashboard/imports",
          ),
        ],
      },
      {
        title: "Review listings to create",
        states: [
          dashboardImporterState(
            "dashboard-importer-ready",
            "Dashboard listings ready",
            "The adaptive listing table before review and creation.",
            "/dashboard/imports",
            false,
          ),
          dashboardImporterState(
            "dashboard-importer-mobile-ready",
            "Mobile dashboard listings ready",
            "The same listing review at phone width without page-level overflow.",
            "/dashboard/imports",
            false,
          ),
          dashboardImporterState(
            "dashboard-importer-row-editor",
            "Dashboard import row editor",
            "A listing edit with the original spreadsheet row retained for reference.",
            "/dashboard/imports",
            false,
          ),
          dashboardImporterState(
            "dashboard-importer-mobile-row-editor",
            "Mobile dashboard import row editor",
            "The same listing edit and source-row reference at phone width.",
            "/dashboard/imports",
            false,
          ),
        ],
      },
      {
        title: "Resolve catalog data",
        states: [
          dashboardImporterState(
            "dashboard-importer-review",
            "Dashboard cultivar review",
            "The shared cultivar decision flow with import-specific outcomes.",
            "/dashboard/imports",
            false,
          ),
          dashboardImporterState(
            "dashboard-importer-mobile-review",
            "Mobile dashboard cultivar review",
            "The same required cultivar decision with every action visible at phone width.",
            "/dashboard/imports",
            false,
          ),
          dashboardImporterState(
            "dashboard-importer-issues",
            "Dashboard spreadsheet issues",
            "Duplicate and price decisions before listings can be created.",
            "/dashboard/imports",
            false,
          ),
          dashboardImporterState(
            "dashboard-importer-mobile-issues",
            "Mobile dashboard spreadsheet issues",
            "The same duplicate and price repairs with unclipped controls at phone width.",
            "/dashboard/imports",
            false,
          ),
        ],
      },
      {
        title: "Resolve existing listings",
        states: [
          dashboardImporterState(
            "dashboard-importer-existing",
            "Existing listing decision",
            "A differing spreadsheet row compared with its existing catalog listing.",
            "/dashboard/imports",
            false,
          ),
          dashboardImporterState(
            "dashboard-importer-mobile-existing",
            "Mobile existing listing decision",
            "The same two distinct existing-listing decisions at phone width.",
            "/dashboard/imports",
            false,
          ),
          dashboardImporterState(
            "dashboard-importer-already-exists",
            "Exact existing listing",
            "An identical catalog listing disclosed before it is skipped.",
            "/dashboard/imports",
            false,
          ),
        ],
      },
      {
        title: "Confirm and create",
        states: [
          dashboardImporterState(
            "dashboard-importer-confirm",
            "Create-only confirmation",
            "The exact new-listing count and create-only consequences before the write.",
            "/dashboard/imports",
            false,
          ),
          dashboardImporterState(
            "dashboard-importer-complete",
            "Catalog import complete",
            "The terminal state after retry-safe listing creation succeeds.",
            "/dashboard/imports",
            false,
          ),
          dashboardImporterState(
            "dashboard-importer-all-existing",
            "All listings already exist",
            "The no-write terminal state when every incoming listing is already present.",
            "/dashboard/imports",
            false,
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
        fullAppIntegrationRef(
          "tests/integration/onboarding-provider-boundaries.integration.ts",
        ),
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
    id: "profile-management",
    audience: "member",
    title: "Manage a grower profile",
    description:
      "Review realistic grower details, prepare profile edits, and inspect profile media at mobile and iPad sizes without saving changes.",
    tests: {
      unit: [testRef("unit", "tests/profile-slug-rules.test.ts")],
      integration: [
        testRef("integration", "tests/slug-change-confirm-dialog.test.tsx"),
        testRef(
          "integration",
          "tests/dashboard-db-user-profile-router.test.ts",
        ),
        testRef(
          "integration",
          "tests/dashboard-db-user-profile-slug-router.test.ts",
        ),
        testRef("integration", "tests/image-preview-dialog.test.tsx"),
        fullAppIntegrationRef(
          "tests/integration/profile-slug-validation.integration.ts",
        ),
      ],
      e2e: [testRef("e2e", "tests/e2e/new-user-journey.e2e.ts")],
    },
    steps: [
      {
        title: "Review the profile",
        states: [
          profileState(
            "profile-management-desktop-populated",
            "Desktop populated profile",
            "Realistic grower details, five profile images, and catalog content at the supported iPad width.",
            "/dashboard/profile",
          ),
          profileState(
            "profile-management-mobile-populated",
            "Mobile populated profile",
            "The same realistic grower profile and media at the supported phone width.",
            "/dashboard/profile",
          ),
        ],
      },
      {
        title: "Prepare profile edits",
        states: [
          profileState(
            "profile-management-desktop-dirty",
            "Desktop unsaved profile edit",
            "A changed garden name with Save Changes enabled, before any mutation.",
            "/dashboard/profile",
            false,
          ),
          profileState(
            "profile-management-mobile-dirty",
            "Mobile unsaved profile edit",
            "The same unsaved profile state at the supported phone width.",
            "/dashboard/profile",
            false,
          ),
          profileState(
            "profile-management-desktop-url-warning",
            "Desktop profile URL warning",
            "The described warning shown before profile URL editing is unlocked.",
            "/dashboard/profile",
            false,
          ),
          profileState(
            "profile-management-mobile-url-warning",
            "Mobile profile URL warning",
            "The same profile URL warning at the supported phone width.",
            "/dashboard/profile",
            false,
          ),
          profileState(
            "profile-management-desktop-url-invalid",
            "Desktop invalid profile URL",
            "Inline minimum-length feedback for an unsaved profile URL.",
            "/dashboard/profile",
            false,
          ),
          profileState(
            "profile-management-mobile-url-invalid",
            "Mobile invalid profile URL",
            "The same invalid profile URL feedback at the supported phone width.",
            "/dashboard/profile",
            false,
          ),
        ],
      },
      {
        title: "Inspect profile media",
        states: [
          profileState(
            "profile-management-desktop-preview",
            "Desktop profile image preview",
            "A seeded profile image opened in the complete gallery preview.",
            "/dashboard/profile",
            false,
          ),
          profileState(
            "profile-management-mobile-preview",
            "Mobile profile image preview",
            "The same gallery preview at the supported phone width.",
            "/dashboard/profile",
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
        fullAppIntegrationRef(
          "tests/integration/create-edit-listing.integration.ts",
        ),
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
    id: "tag-printing",
    audience: "member",
    title: "Create and print plant tags",
    description:
      "Choose a useful tag preset or create a custom template from real listing fields.",
    tests: {
      unit: [testRef("unit", "tests/tag-designer-model.test.ts")],
      integration: [
        testRef("integration", "tests/tag-designer-panel.test.tsx"),
        testRef("integration", "tests/tag-print-table.test.ts"),
      ],
      e2e: [],
    },
    steps: [
      {
        title: "Choose tag content",
        states: [
          tagState(
            "tag-printing-garden-id",
            "Garden ID tags",
            "The compact default preset across eight listings with long, short, complete, and incomplete data.",
            "/dashboard/tags",
            false,
          ),
          tagState(
            "tag-printing-simple-name",
            "Simple name tags",
            "The most legible name-only preset across the same mixed listing batch.",
            "/dashboard/tags",
            false,
          ),
          tagState(
            "tag-printing-sale-tag",
            "Sale tags",
            "A compact sales preset that includes price where available and omits missing values cleanly.",
            "/dashboard/tags",
            false,
          ),
          tagState(
            "tag-printing-grower-details",
            "Grower detail tags",
            "The roomier preset with bloom, scape, season, habit, and identity details.",
            "/dashboard/tags",
            false,
          ),
          tagState(
            "tag-printing-custom",
            "Custom tag template",
            "The line-based custom editor combining listing fields in a live tag preview.",
            "/dashboard/tags",
            false,
          ),
          tagState(
            "tag-printing-ai-instructions",
            "AI template instructions",
            "Copyable syntax guidance with every available tag field and the current template.",
            "/dashboard/tags",
            false,
          ),
          tagState(
            "tag-printing-sheet",
            "Sheet creator",
            "The secondary sheet workflow using the same selected tags and current custom layout.",
            "/dashboard/tags",
            false,
          ),
        ],
      },
    ],
  },
  {
    id: "listing-media",
    audience: "member",
    title: "Manage listing images",
    description:
      "Review, preview, reorder, remove, and prepare listing photos without sending an upload.",
    tests: {
      unit: [testRef("unit", "tests/use-image-upload.test.ts")],
      integration: [
        testRef("integration", "tests/image-upload.test.tsx"),
        testRef("integration", "tests/dashboard-db-image-router.test.ts"),
      ],
      e2e: [testRef("e2e", "tests/e2e/listing-image-manager.e2e.ts")],
    },
    steps: [
      {
        title: "Review listing photos",
        states: [
          listingMediaState(
            "listing-media-desktop-populated",
            "Desktop populated image grid",
            "Nine real listing photos in the four-column desktop manager.",
            "/dashboard/listings?size=10&query=18-33",
            false,
          ),
          listingMediaState(
            "listing-media-mobile-populated",
            "Mobile populated image grid",
            "The same listing photos in the two-column mobile manager.",
            "/dashboard/listings?size=10&query=18-33",
            false,
          ),
          listingMediaState(
            "listing-media-desktop-empty",
            "Desktop empty image manager",
            "A listing with no owned photos and its available upload dropzone.",
            "/dashboard/listings?size=10&query=Bee-ba-tized",
            false,
          ),
          listingMediaState(
            "listing-media-mobile-empty",
            "Mobile empty image manager",
            "The empty owned-photo state and upload dropzone on a phone.",
            "/dashboard/listings?size=10&query=Bee-ba-tized",
            false,
          ),
        ],
      },
      {
        title: "Inspect a photo",
        states: [
          listingMediaState(
            "listing-media-desktop-preview",
            "Desktop full-size preview",
            "A listing photo opened in the real gallery preview.",
            "/dashboard/listings?size=10&query=18-33",
            false,
          ),
          listingMediaState(
            "listing-media-mobile-preview",
            "Mobile full-size preview",
            "The same gallery preview at the phone viewport.",
            "/dashboard/listings?size=10&query=18-33",
            false,
          ),
        ],
      },
      {
        title: "Prepare a change",
        states: [
          listingMediaState(
            "listing-media-delete-confirmation",
            "Delete image confirmation",
            "The destructive confirmation before any listing photo is removed.",
            "/dashboard/listings?size=10&query=18-33",
            false,
          ),
          listingMediaState(
            "listing-media-reorder-active",
            "Pointer reorder target",
            "The first photo held between the first two slots with the sortable control active, before dropping.",
            "/dashboard/listings?size=10&query=18-33",
            false,
          ),
          listingMediaState(
            "listing-media-desktop-crop",
            "Desktop selected-file crop",
            "A local image selected for cropping before any upload request.",
            "/dashboard/listings?size=10&query=Bee-ba-tized",
            false,
          ),
          listingMediaState(
            "listing-media-mobile-crop",
            "Mobile selected-file crop",
            "The same pre-upload crop controls on a phone.",
            "/dashboard/listings?size=10&query=Bee-ba-tized",
            false,
          ),
        ],
      },
    ],
  },
  {
    id: "list-management",
    audience: "member",
    title: "Organize catalog listings into a list",
    description:
      "Review real catalog lists, start a collection, and manage listing membership at mobile and desktop sizes.",
    tests: {
      unit: [testRef("unit", "tests/manage-list-columns.test.ts")],
      integration: [
        testRef("integration", "tests/add-listings-combobox.test.tsx"),
        testRef(
          "integration",
          "tests/dashboard-db-list-membership-sync.test.tsx",
        ),
        testRef("integration", "tests/list-form-boundary-save.test.tsx"),
        testRef(
          "integration",
          "tests/manage-list-page-membership-commit.test.tsx",
        ),
        testRef("integration", "tests/use-list-resource.test.tsx"),
      ],
      e2e: [
        testRef("e2e", "tests/e2e/lists-page-features.e2e.ts"),
        testRef("e2e", "tests/e2e/manage-list-page-features.e2e.ts"),
      ],
    },
    steps: [
      {
        title: "Review catalog lists",
        states: [
          listState(
            "list-management-desktop-library",
            "Desktop list library",
            "Seven realistic Rolling Oaks collections with listing counts and member actions.",
            "/dashboard/lists",
          ),
          listState(
            "list-management-mobile-library",
            "Mobile list library",
            "The same member collections at the supported phone size.",
            "/dashboard/lists",
          ),
        ],
      },
      {
        title: "Start a collection",
        states: [
          listState(
            "list-management-desktop-create",
            "Desktop new list",
            "A named but unsaved collection with the save actions ready.",
            "/dashboard/lists?creating=true",
            false,
          ),
          listState(
            "list-management-mobile-create",
            "Mobile new list",
            "The same unsaved collection surface at the supported phone size.",
            "/dashboard/lists?creating=true",
            false,
          ),
        ],
      },
      {
        title: "Manage a populated collection",
        states: [
          listState(
            "list-management-desktop-populated",
            "Desktop populated list",
            "A real 22-listing introductions collection with editable details and membership controls.",
            "/dashboard/lists/7",
          ),
          listState(
            "list-management-mobile-populated",
            "Mobile populated list",
            "The same realistic collection and listings table at the supported phone size.",
            "/dashboard/lists/7",
          ),
        ],
      },
      {
        title: "Find a listing to add",
        states: [
          listState(
            "list-management-desktop-add",
            "Desktop add-listing results",
            "A catalog listing outside the collection found through the real add-listing dialog.",
            "/dashboard/lists/7",
            false,
          ),
          listState(
            "list-management-mobile-add",
            "Mobile add-listing results",
            "The same filtered add-listing choice at the supported phone size.",
            "/dashboard/lists/7",
            false,
          ),
        ],
      },
      {
        title: "Review a removal",
        states: [
          listState(
            "list-management-desktop-remove",
            "Desktop remove confirmation",
            "A selected real listing at the final confirmation before removal.",
            "/dashboard/lists/7",
            false,
          ),
          listState(
            "list-management-mobile-remove",
            "Mobile remove confirmation",
            "The same non-destructive review state at the supported phone size.",
            "/dashboard/lists/7",
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
        testRef("integration", "tests/floating-cart-button.test.tsx"),
        testRef("integration", "tests/public-inquiry.test.ts"),
        testRef("integration", "tests/public-inquiry-rate-limit.test.ts"),
        testRef("integration", "tests/public-router-send-message.test.ts"),
        fullAppIntegrationRef(
          "tests/integration/buyer-inquiry-email.integration.ts",
        ),
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
export function confidenceCommandsForFlow(flow) {
  const integrationReferences = flow.tests.integration;
  const vitestFiles = [...flow.tests.unit, ...integrationReferences]
    .filter(({ runner }) => runner === "vitest")
    .map(({ path: testPath }) => testPath);
  const fullAppIntegrationFiles = integrationReferences
    .filter(({ runner }) => runner === "full-app-integration")
    .map(({ path: testPath }) => testPath);
  const e2eFiles = flow.tests.e2e.map(({ path: testPath }) => testPath);
  return [
    vitestFiles.length
      ? `pnpm main exec vitest run --maxWorkers=1 ${vitestFiles.join(" ")}`
      : null,
    fullAppIntegrationFiles.length
      ? `node apps/main/scripts/run-integration-local.mjs ${fullAppIntegrationFiles.join(" ")}`
      : null,
    e2eFiles.length
      ? `pnpm main exec playwright test --retries=0 ${e2eFiles.join(" ")}`
      : null,
  ].filter(Boolean);
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

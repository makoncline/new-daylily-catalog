// @ts-nocheck -- Directly executable Node registry, contract-tested by Vitest.
import { existsSync, statSync } from "node:fs";
import path from "node:path";
const stateFor =
  (captureSpec, atlasFlowId) =>
  (id, title, description, url, urlReproducible = true) => ({
    id,
    title,
    description,
    capture: `${id}.png`,
    captureSpec,
    reproductionCommand: `node apps/main/scripts/run-atlas-flow.mjs ${atlasFlowId} --output=local/atlas/reproduce`,
    url,
    urlReproducible,
  });
const publicState = stateFor(
  "tests/atlas/public-catalog.atlas.ts",
  "public-catalog",
);
const cultivarState = stateFor(
  "tests/atlas/cultivar-search.atlas.ts",
  "cultivar-search",
);
const importerState = stateFor(
  "tests/atlas/catalog-importer.atlas.ts",
  "catalog-importer",
);
const dashboardImporterState = stateFor(
  "tests/atlas/dashboard-catalog-importer.atlas.ts",
  "dashboard-catalog-importer",
);
const onboardingState = stateFor(
  "tests/atlas/onboarding-membership.atlas.ts",
  "onboarding-membership",
);
const dashboardHomeState = stateFor(
  "tests/atlas/dashboard-home.atlas.ts",
  "dashboard-home",
);
const listingState = stateFor(
  "tests/atlas/listing-management.atlas.ts",
  "listing-management",
);
const listingMediaState = stateFor(
  "tests/atlas/listing-media.atlas.ts",
  "listing-media",
);
const listState = stateFor(
  "tests/atlas/list-management.atlas.ts",
  "list-management",
);
const tagState = stateFor("tests/atlas/tag-printing.atlas.ts", "tag-printing");
const buyerState = stateFor(
  "tests/atlas/buyer-inquiry.atlas.ts",
  "buyer-inquiry",
);
const profileState = stateFor(
  "tests/atlas/profile-management.atlas.ts",
  "profile-management",
);
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
    implementation: {
      entryPoints: [
        {
          label: "Profile page data",
          path: "src/app/(public)/[userSlugOrId]/_lib/public-profile-route.ts",
        },
        {
          label: "Published listing reads",
          path: "src/server/db/public-listing-read-model.ts",
        },
      ],
      invariants: [
        "Read public data through the replica and apply published-listing filters.",
        "Keep profile data and listing cards in the first HTML response.",
      ],
    },
    tests: {
      unit: [],
      integration: [
        testRef("integration", "tests/public-profile-route.test.ts"),
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
        testRef("e2e", "tests/e2e/public-profile-first-response.e2e.ts"),
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
        testRef("integration", "tests/cultivar-name-match.integration.test.ts"),
        testRef("integration", "tests/cultivar-match-route.test.ts"),
        testRef("integration", "tests/catalog-importer.test.ts"),
        testRef("integration", "tests/catalog-importer-draft.test.ts"),
        testRef("integration", "tests/catalog-importer-workbench.test.tsx"),
        testRef("integration", "tests/catalog-importer-session.test.tsx"),
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
          importerState(
            "catalog-importer-desktop-manual-empty",
            "Desktop empty manual catalog",
            "The manual builder before its first listing is added.",
            "/catalog-importer",
            false,
          ),
          importerState(
            "catalog-importer-desktop-manual-linked",
            "Desktop linked manual listing",
            "Automatic cultivar search and the compact linked-cultivar row.",
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
      "Build one browser-local import, select its eligible listings, and create new catalog listings.",
    implementation: {
      entryPoints: [
        {
          label: "Prepared import view",
          path: "src/app/dashboard/imports/_components/dashboard-catalog-importer.tsx",
        },
        {
          label: "Import writes and refresh",
          path: "src/app/dashboard/imports/_components/use-dashboard-catalog-import.ts",
        },
        {
          label: "Import server validation",
          path: "src/server/api/routers/dashboard-db/listing.ts",
        },
      ],
      invariants: [
        "Keep the prepared draft and source rows across reloads and rejected writes.",
        "Create eligible, selected rows in batches of at most 100 and prevent duplicate writes.",
        "After a saved write, retry a failed dashboard refresh without writing the rows again.",
      ],
    },
    tests: {
      unit: [],
      integration: [
        testRef("integration", "tests/dashboard-import-table.test.tsx"),
        testRef(
          "integration",
          "tests/dashboard-import-existing-listings.test.tsx",
        ),
        testRef("integration", "tests/dashboard-import-start-over.test.tsx"),
        fullAppIntegrationRef(
          "tests/integration/dashboard-imports.integration.ts",
        ),
      ],
      e2e: [testRef("e2e", "tests/e2e/catalog-importer.e2e.ts")],
    },
    steps: [
      {
        title: "Open the shared builder",
        states: [
          dashboardImporterState(
            "dashboard-importer-start",
            "Dashboard importer start",
            "The signed-in handoff to the shared browser-local import builder.",
            "/dashboard/imports",
          ),
        ],
      },
      {
        title: "Select listings to create",
        states: [
          dashboardImporterState(
            "dashboard-importer-ready",
            "Dashboard listings ready",
            "Eligible prepared rows with only final import selection controls.",
            "/dashboard/imports",
            false,
          ),
          dashboardImporterState(
            "dashboard-importer-mobile-ready",
            "Mobile dashboard listings ready",
            "The same final selection table at phone width without page-level overflow.",
            "/dashboard/imports",
            false,
          ),
        ],
      },
      {
        title: "Explain excluded rows",
        states: [
          dashboardImporterState(
            "dashboard-importer-review",
            "Unreviewed listings excluded",
            "Rows that still need a cultivar decision are excluded and link back to the builder.",
            "/dashboard/imports",
            false,
          ),
          dashboardImporterState(
            "dashboard-importer-mobile-review",
            "Mobile unreviewed listings",
            "The same exclusion summary and builder return path at phone width.",
            "/dashboard/imports",
            false,
          ),
          dashboardImporterState(
            "dashboard-importer-issues",
            "Unresolved data excluded",
            "Rows with unresolved spreadsheet issues are excluded without repair controls.",
            "/dashboard/imports",
            false,
          ),
          dashboardImporterState(
            "dashboard-importer-mobile-issues",
            "Mobile unresolved data",
            "The same issue exclusion summary at phone width.",
            "/dashboard/imports",
            false,
          ),
          dashboardImporterState(
            "dashboard-importer-existing",
            "Existing listing skipped",
            "A prepared row already represented in the member catalog, with no create override.",
            "/dashboard/imports",
            false,
          ),
          dashboardImporterState(
            "dashboard-importer-mobile-existing",
            "Mobile existing listing",
            "The same skipped existing listing at phone width.",
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
        ],
      },
    ],
  },
  {
    id: "onboarding-membership",
    audience: "member",
    title: "Create a catalog and start membership",
    description:
      "Understand the grower offer, transform an existing catalog, and continue to Stripe-hosted membership checkout.",
    tests: {
      unit: [
        testRef("unit", "tests/catalog-importer-draft.test.ts"),
        testRef("unit", "tests/catalog-importer-file.test.ts"),
      ],
      integration: [
        testRef("integration", "tests/catalog-importer-workbench.test.tsx"),
        testRef(
          "integration",
          "tests/catalog-importer-checkout-router.test.ts",
        ),
        testRef("integration", "tests/use-pro.test.tsx"),
        fullAppIntegrationRef(
          "tests/integration/catalog-importer-checkout-provider-boundaries.integration.ts",
        ),
      ],
      e2e: [testRef("e2e", "tests/e2e/catalog-importer-onboarding.e2e.ts")],
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
        title: "Bring a catalog",
        states: [
          onboardingState(
            "onboarding-importer-start",
            "Catalog source choices",
            "Upload, manual entry, and sample paths start the same private preview.",
            "/catalog-importer",
          ),
        ],
      },
      {
        title: "See the transformation",
        states: [
          onboardingState(
            "onboarding-importer-results",
            "Personalized catalog results",
            "Matched listings, reference photos, cleanup work, and the Pro publishing bridge.",
            "/catalog-importer",
            false,
          ),
        ],
      },
      {
        title: "Choose the outcome",
        states: [
          onboardingState(
            "onboarding-importer-choice",
            "Download or publish",
            "The explicit choice between free prepared files and a live Pro catalog.",
            "/catalog-importer",
            false,
          ),
        ],
      },
    ],
  },
  {
    id: "dashboard-home",
    audience: "member",
    title: "Choose the next catalog action",
    description:
      "Orient on the dashboard across setup, membership, billing, and established Pro states without multiplying partial-state permutations.",
    tests: {
      unit: [testRef("unit", "tests/build-dashboard-stats.test.ts")],
      integration: [
        testRef("integration", "tests/pro-membership-card.test.tsx"),
        testRef("integration", "tests/persisted-subscription-query.test.ts"),
      ],
      e2e: [
        testRef("e2e", "tests/e2e/preview-sign-in.e2e.ts"),
        testRef("e2e", "tests/e2e/new-user-journey.e2e.ts"),
        testRef("e2e", "tests/e2e/catalog-importer-onboarding.e2e.ts"),
      ],
    },
    steps: [
      {
        title: "Finish setup",
        states: [
          dashboardHomeState(
            "dashboard-home-desktop-setup",
            "Desktop setup guidance",
            "Combined incomplete profile and catalog guidance with the membership offer at the supported iPad width.",
            "/dashboard",
            false,
          ),
          dashboardHomeState(
            "dashboard-home-mobile-setup",
            "Mobile setup guidance",
            "The same combined setup guidance and membership offer at the supported phone width.",
            "/dashboard",
            false,
          ),
        ],
      },
      {
        title: "Start membership",
        states: [
          dashboardHomeState(
            "dashboard-home-desktop-upgrade",
            "Desktop membership upgrade",
            "A complete free catalog with the remaining Pro membership decision at the supported iPad width.",
            "/dashboard",
            false,
          ),
          dashboardHomeState(
            "dashboard-home-mobile-upgrade",
            "Mobile membership upgrade",
            "The same complete free catalog and Pro decision at the supported phone width.",
            "/dashboard",
            false,
          ),
        ],
      },
      {
        title: "Resolve billing",
        states: [
          dashboardHomeState(
            "dashboard-home-desktop-billing",
            "Desktop billing attention",
            "A complete catalog with past-due billing guidance and recovery actions at the supported iPad width.",
            "/dashboard",
            false,
          ),
          dashboardHomeState(
            "dashboard-home-mobile-billing",
            "Mobile billing attention",
            "The same past-due billing recovery state at the supported phone width.",
            "/dashboard",
            false,
          ),
        ],
      },
      {
        title: "Return as an established Pro",
        states: [
          dashboardHomeState(
            "dashboard-home-desktop-active-pro",
            "Desktop active Pro",
            "A complete active-Pro catalog after all conditional guidance disappears at the supported iPad width.",
            "/dashboard",
            false,
          ),
          dashboardHomeState(
            "dashboard-home-mobile-active-pro",
            "Mobile active Pro",
            "The same established-Pro dashboard at the supported phone width.",
            "/dashboard",
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
    implementation: {
      entryPoints: [
        {
          label: "Profile sections",
          path: "src/components/forms/profile-form.tsx",
        },
        {
          label: "Profile save and draft state",
          path: "src/hooks/use-profile-form.ts",
        },
        {
          label: "Profile image actions",
          path: "src/app/dashboard/profile/_components/profile-image-manager.tsx",
        },
        {
          label: "Remote MCP member authentication",
          path: "src/server/mcp/read-only-mcp.ts",
        },
        {
          label: "Member API authentication and account tier",
          path: "src/server/api/member-http.ts",
        },
        {
          label: "MCP OAuth resource discovery",
          path: "src/app/.well-known/oauth-protected-resource/api/mcp/server/route.ts",
        },
        {
          label: "Plugin submission package",
          path: "scripts/build-plugin.mjs",
        },
        {
          label: "Plugin review cases",
          path: "../../plugins/daylily-catalog/review-cases.json",
        },
      ],
      invariants: [
        "Keep field and content drafts during refresh and failed navigation saves.",
        "Include child content and media changes in the parent commit.",
        "Ignore late URL validation results and keep drafts after rejected writes.",
        "Reject member MCP requests before database reads when the token, scope, or client is not allowed.",
        "Allow confirmed non-Pro remote writes within dashboard limits; reject unconfirmed billing and keep destructive MCP actions in dashboard approval.",
        "Publish MCP endpoint resource metadata and complete tool-level OAuth challenges.",
        "Build the complete plugin with a reviewer video URL kept outside public source. Reuse sample records on repeated review runs.",
        "Store member versions as integer milliseconds and preserve stale-write rejection.",
      ],
    },
    tests: {
      unit: [testRef("unit", "tests/profile-slug-rules.test.ts")],
      integration: [
        testRef("integration", "tests/oauth-metadata.test.ts"),
        testRef("integration", "tests/mcp-read-only.test.ts"),
        testRef(
          "integration",
          "tests/member-version-storage.integration.test.ts",
        ),
        testRef("integration", "tests/daylily-plugin-package.test.ts"),
        testRef(
          "integration",
          "tests/member-non-pro-access.integration.test.ts",
        ),
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
        fullAppIntegrationRef(
          "tests/integration/profile-workflow.integration.ts",
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
    implementation: {
      entryPoints: [
        {
          label: "Listing mutations",
          path: "src/server/api/routers/dashboard-db/listing.ts",
        },
        {
          label: "Remote member write adapter",
          path: "src/server/mcp/member-write-mcp.ts",
        },
        {
          label: "Listing edit form",
          path: "src/components/forms/listing-form.tsx",
        },
        {
          label: "Listing save and draft state",
          path: "src/components/forms/use-listing-form.ts",
        },
        {
          label: "Listing editor history",
          path: "src/app/dashboard/listings/_components/edit-listing-dialog.tsx",
        },
      ],
      invariants: [
        "Store member versions as integer milliseconds and preserve stale-write rejection.",
        "Scope listing writes to the authenticated user on the server.",
        "Enforce the same non-Pro create cap for dashboard, member API, and MCP callers. Reuse the confirmed tier within each remote request.",
        "Validate before save and keep the form open when save fails.",
        "Save listing fields through the editor; write media and membership changes at once and mark the parent for commit.",
        "Keep drafts after rejected saves and canceled browser history changes.",
        "Confirm saved values after a new page load.",
      ],
    },
    tests: {
      unit: [testRef("unit", "tests/listings-search-normalization.test.tsx")],
      integration: [
        testRef(
          "integration",
          "tests/member-version-storage.integration.test.ts",
        ),
        testRef("integration", "tests/daylily-plugin-package.test.ts"),
        testRef(
          "integration",
          "tests/dashboard-db-listing-entitlements.integration.test.ts",
        ),
        testRef(
          "integration",
          "tests/member-non-pro-access.integration.test.ts",
        ),
        testRef("integration", "tests/listings-table-filter-columns.test.tsx"),
        testRef("integration", "tests/create-listing-dialog.test.tsx"),
        testRef("integration", "tests/listing-dialog-query-state.test.tsx"),
        testRef("integration", "tests/edit-listing-dialog-url-sync.test.tsx"),
        fullAppIntegrationRef(
          "tests/integration/create-edit-listing.integration.ts",
        ),
        fullAppIntegrationRef("tests/integration/editor-save.integration.ts"),
        fullAppIntegrationRef(
          "tests/integration/surface-history.integration.ts",
        ),
      ],
      e2e: [
        testRef("e2e", "tests/e2e/dashboard-listings-search-touch.e2e.ts"),
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
    implementation: {
      entryPoints: [
        {
          label: "Tag search and selection",
          path: "src/app/dashboard/tags/_components/tag-print-table.tsx",
        },
        {
          label: "Tag design and output actions",
          path: "src/app/dashboard/tags/_components/use-tag-designer-controller.ts",
        },
        {
          label: "Print document geometry",
          path: "src/app/dashboard/tags/_components/tag-designer-html.ts",
        },
      ],
      invariants: [
        "Keep selected listings for output when search filters change.",
        "Keep private search text in the browser and out of shared URLs.",
        "Preserve physical tag and sheet dimensions in preview, print, and downloads.",
      ],
    },
    tests: {
      unit: [testRef("unit", "tests/tag-designer-model.test.ts")],
      integration: [
        testRef("integration", "tests/tag-designer-panel.test.tsx"),
        testRef("integration", "tests/tag-print-table.test.ts"),
        fullAppIntegrationRef("tests/integration/tag-printing.integration.ts"),
        fullAppIntegrationRef("tests/integration/tags-search.integration.ts"),
      ],
      e2e: [],
    },
    steps: [
      {
        title: "Choose tag content",
        states: [
          tagState(
            "tag-printing-unselected",
            "No listing selected",
            "Sample preview and disabled output controls before selecting listings.",
            "/dashboard/tags",
            false,
          ),
          tagState(
            "tag-printing-no-results",
            "No listing matches the filter",
            "A filtered table with no matching rows.",
            "/dashboard/tags",
            false,
          ),
          tagState(
            "tag-printing-garden-id",
            "Garden ID tags",
            "The compact default preset across eight listings with long, short, complete, and incomplete data.",
            "/dashboard/tags",
            false,
          ),
          tagState(
            "tag-printing-output-menu",
            "Output menu",
            "Available tag downloads for selected listings.",
            "/dashboard/tags",
            false,
          ),
          tagState(
            "tag-printing-qr-off",
            "QR code off",
            "Selected tags with QR codes disabled.",
            "/dashboard/tags",
            false,
          ),
          tagState(
            "tag-printing-invalid-size",
            "Invalid custom tag size",
            "Validation keeps the last valid physical tag width.",
            "/dashboard/tags",
            false,
          ),
          tagState(
            "tag-printing-custom-size",
            "Custom tag size",
            "A valid user-defined physical tag width.",
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
          tagState(
            "tag-printing-sheet-quantity",
            "Sheet quantity",
            "Two copies of each selected label in the sheet preview.",
            "/dashboard/tags",
            false,
          ),
          tagState(
            "tag-printing-sheet-invalid",
            "Sheet cannot fit tags",
            "Invalid sheet geometry blocks print and download controls.",
            "/dashboard/tags",
            false,
          ),
          tagState(
            "tag-printing-mobile-garden-id",
            "Garden ID tags on mobile",
            "The selected listing, template, preview, output controls, and table at a phone width.",
            "/dashboard/tags",
            false,
          ),
          tagState(
            "tag-printing-mobile-sheet",
            "Sheet creator on mobile",
            "The sheet settings, preview, and actions at a phone width.",
            "/dashboard/tags",
            false,
          ),
          tagState(
            "tag-printing-dark-garden-id",
            "Garden ID tags in dark theme",
            "Dark app controls around a paper-accurate light tag preview.",
            "/dashboard/tags",
            false,
          ),
          tagState(
            "tag-printing-saved-template",
            "Saved template",
            "A browser-local tag template appears in the template picker.",
            "/dashboard/tags",
            false,
          ),
          tagState(
            "tag-printing-delete-confirmation",
            "Delete template confirmation",
            "The destructive action asks for confirmation before removing a saved template.",
            "/dashboard/tags",
            false,
          ),
          tagState(
            "tag-printing-mobile-saved-template",
            "Saved template on mobile",
            "The browser-local template choice remains usable at a phone width.",
            "/dashboard/tags",
            false,
          ),
          tagState(
            "tag-printing-mobile-delete-confirmation",
            "Delete template confirmation on mobile",
            "The confirmation and destructive action remain readable at a phone width.",
            "/dashboard/tags",
            false,
          ),
          tagState(
            "tag-printing-template-errors",
            "Custom template errors",
            "The editor links unknown-field and layout validation messages to its instructions.",
            "/dashboard/tags",
            false,
          ),
          tagState(
            "tag-printing-ai-manual-copy",
            "Manual AI instructions copy",
            "Clipboard rejection selects the complete prompt and gives manual copy instructions.",
            "/dashboard/tags",
            false,
          ),
          tagState(
            "tag-printing-mobile-ai-manual-copy",
            "Manual AI instructions copy on mobile",
            "An unavailable clipboard selects the prompt and shows manual copy feedback at a phone width.",
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
        fullAppIntegrationRef("tests/integration/listing-media.integration.ts"),
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
    implementation: {
      entryPoints: [
        {
          label: "Lists overview",
          path: "src/app/dashboard/lists/_components/lists-table.tsx",
        },
        {
          label: "List mutations and account limits",
          path: "src/server/api/routers/dashboard-db/list.ts",
        },
        {
          label: "List editor save and draft state",
          path: "src/components/forms/list-form.tsx",
        },
        {
          label: "List membership and navigation",
          path: "src/app/dashboard/lists/[listId]/page.tsx",
        },
        {
          label: "List editor history",
          path: "src/app/dashboard/lists/_hooks/use-list-surface-state.ts",
        },
        {
          label: "Server request correlation",
          path: "src/server/observability/log-context.ts",
        },
        {
          label: "Browser request correlation",
          path: "src/trpc/correlated-fetch.ts",
        },
        {
          label: "Browser request logs",
          path: "src/trpc/client-links.ts",
        },
        {
          label: "Structured logs and safe attributes",
          path: "src/lib/telemetry.ts",
        },
      ],
      invariants: [
        "Store member versions as integer milliseconds and preserve stale-write rejection.",
        "Save list fields through the editor; write membership changes at once and mark the parent for commit.",
        "Enforce the same non-Pro list cap for dashboard, member API, and MCP callers, including safe create retries.",
        "Keep drafts after rejected saves and canceled browser history changes.",
        "Keep title and actions pinned in the overview; keep selection and title pinned in Manage List.",
        "Use the same correlation ID in request headers, responses, browser logs, and server logs for successful requests and rejected deletions.",
        "Keep list descriptions out of diagnostic logs.",
      ],
    },
    tests: {
      unit: [testRef("unit", "tests/manage-list-columns.test.ts")],
      integration: [
        testRef(
          "integration",
          "tests/member-version-storage.integration.test.ts",
        ),
        testRef("integration", "tests/daylily-plugin-package.test.ts"),
        testRef("integration", "tests/add-listings-combobox.test.tsx"),
        testRef(
          "integration",
          "tests/member-non-pro-access.integration.test.ts",
        ),
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
        fullAppIntegrationRef(
          "tests/integration/list-management.integration.ts",
        ),
        fullAppIntegrationRef("tests/integration/editor-save.integration.ts"),
        fullAppIntegrationRef(
          "tests/integration/surface-history.integration.ts",
        ),
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
    if (flow.implementation) {
      for (const entryPoint of flow.implementation.entryPoints) {
        if (!existsSync(path.resolve(appRoot, entryPoint.path)))
          throw new Error(
            `Missing implementation entry point: ${entryPoint.path}`,
          );
      }
    }
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

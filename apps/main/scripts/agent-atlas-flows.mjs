/** @typedef {{ title: string; captureName: string | null }} AtlasState */
/** @typedef {{ title: string; states: AtlasState[] }} AtlasStep */
/** @typedef {{ id: string; audience: "public" | "member"; title: string; description: string; steps: AtlasStep[] }} AtlasFlow */
/** @typedef {{ project: string; name: string; [key: string]: unknown }} AtlasCapture */

/** @type {AtlasFlow[]} */
export const ATLAS_FLOWS = [
  {
    id: "discover-catalogs",
    audience: "public",
    title: "Discover Catalogs",
    description: "Find a grower and enter a production-sized catalog.",
    steps: [
      step("Entry points", [
        state("Homepage", "home-page"),
        state("Catalog directory", "catalog-directory"),
        state("Mobile directory", "catalog-directory-mobile"),
      ]),
      step("Choose a grower", [
        state("Large catalog", "rolling-oaks-public-catalog"),
        state("Second catalog", "plant-fancy-public-catalog"),
      ]),
    ],
  },
  {
    id: "browse-public-catalog",
    audience: "public",
    title: "Browse a Public Catalog",
    description: "Search, filter, and inspect listings as a buyer.",
    steps: [
      step("Open catalog", [
        state("Desktop catalog", "rolling-oaks-public-catalog"),
        state("Mobile catalog", "rolling-oaks-public-mobile"),
      ]),
      step("Find listings", [
        state("Search results", "catalog-search-results"),
        state("Advanced filters", "public-catalog-advanced-filters"),
        state("No results", "public-catalog-no-results"),
        state("Pagination", "public-catalog-pagination"),
      ]),
      step("Inspect listing", [
        state("Listing detail", "representative-public-listing"),
        state("Alternate image selected", "public-listing-alternate-image"),
        state("Unavailable or hidden listing", "public-listing-unavailable"),
      ]),
    ],
  },
  {
    id: "contact-grower",
    audience: "public",
    title: "Build a Cart and Contact the Grower",
    description: "Choose plants and send the seller a useful request.",
    steps: [
      step("Choose plants", [
        state("Catalog results", "catalog-search-results"),
        state("Listing detail", "representative-public-listing"),
        state("Listing added to cart", "contact-grower-one-cart-item"),
        state("Multiple cart items", "contact-grower-multiple-cart-items"),
      ]),
      step("Compose request", [
        state("Empty contact form", "contact-grower-empty-form"),
        state("Cart populated", "contact-grower-cart-populated"),
        state("Invalid email", "contact-grower-invalid-email"),
        state("Completed message", "contact-grower-completed-message"),
      ]),
      step("Send request", [
        state("Submitting", "contact-grower-submitting"),
        state("Success and keep-cart choice", "contact-grower-success"),
        state("Submission failure", "contact-grower-failure"),
      ]),
    ],
  },
  {
    id: "research-cultivar",
    audience: "public",
    title: "Research a Cultivar and Compare Offers",
    description:
      "Understand a cultivar, compare growers, and continue into an available offer.",
    steps: [
      step("Open cultivar research", [
        state("Cultivar overview", "cultivar-overview"),
        state("Cultivar imagery and facts", "cultivar-facts"),
      ]),
      step("Compare availability", [
        state("Multiple grower offers", "cultivar-grower-offers"),
        state("No available offers", "cultivar-no-offers"),
      ]),
      step("Continue to a grower", [
        state("Selected grower listing", "cultivar-selected-offer"),
      ]),
    ],
  },
  {
    id: "join-membership",
    audience: "public",
    title: "Join and Create a First Catalog",
    description:
      "Move from membership information to a ready-to-publish catalog.",
    steps: [
      step("Understand membership", [
        state("Membership page", "start-membership"),
        state("Signed-out onboarding", "signed-out-onboarding"),
      ]),
      step("Enter email", [
        state("Empty email", "onboarding-email-empty"),
        state("Invalid email", "onboarding-email-invalid"),
        state("Valid email", "onboarding-email-valid"),
      ]),
      step("Build profile", [
        state("Empty profile", "onboarding-profile-empty"),
        state("Completed profile", "onboarding-profile-filled"),
        state("Upload mode", "onboarding-profile-upload-mode"),
        state("Image crop", "onboarding-profile-image-crop"),
        state("Alternate starter image", "onboarding-profile-starter-selected"),
        state("Name overlay disabled", "onboarding-profile-overlay-disabled"),
      ]),
      step("Create first listing", [
        state("Empty listing", "onboarding-listing-empty"),
        state("Completed listing", "onboarding-listing-filled"),
        state("Cultivar selected", "onboarding-listing-cultivar-selected"),
        state("Listing image crop", "onboarding-listing-image-crop"),
      ]),
      step("Preview and purchase", [
        state("Catalog preview", "onboarding-catalog-preview"),
        state("Return to edit from preview", "onboarding-return-to-edit"),
        state("Checkout", "onboarding-checkout"),
        state("Checkout email editing", "onboarding-checkout-email-edit"),
        state("Checkout success", "onboarding-checkout-success"),
        state("Account verification", "onboarding-account-verification"),
        state("Created catalog dashboard", "onboarding-created-dashboard"),
      ]),
    ],
  },
  {
    id: "authentication",
    audience: "public",
    title: "Sign In and Return to Work",
    description: "Authenticate safely and reach the member dashboard.",
    steps: [
      step("Sign in", [
        state("Sign-in page", "sign-in-page"),
        state("Invalid email", "authentication-invalid-email"),
        state("Verification code", "authentication-verification-code"),
        state("Invalid code", "authentication-invalid-code"),
      ]),
      step("Complete authentication", [
        state("Dashboard reached", "dashboard-overview"),
        state("Authentication error", "authentication-error-page"),
        state("Signed-out redirect", "authentication-signed-out-redirect"),
      ]),
    ],
  },
  {
    id: "help-and-trust",
    audience: "public",
    title: "Get Help and Understand Policies",
    description: "Find support and understand how the service handles data.",
    steps: [
      step("Get help", [state("Support page", "support-page")]),
      step("Review policies", [
        state("Privacy", "privacy-page"),
        state("Terms", "terms-page"),
      ]),
    ],
  },
  {
    id: "catalog-overview",
    audience: "member",
    title: "Understand Catalog Status",
    description: "See inventory, profile, and membership state at a glance.",
    steps: [
      step("Review dashboard", [
        state("Overview", "dashboard-overview"),
        state("Listings summary", "dashboard-listings"),
        state("Lists summary", "dashboard-lists"),
        state("Profile summary", "dashboard-profile"),
      ]),
    ],
  },
  {
    id: "create-edit-listing",
    audience: "member",
    title: "Create and Edit a Listing",
    description: "Create a listing and fully prepare it for buyers.",
    steps: [
      step("Start creation", [
        state("Listings page", "listings-next-default"),
        state("Empty create dialog", "listings-next-create-dialog"),
        state("Legacy empty dialog reference", "create-listing-dialog-empty"),
        state("Cultivar picker", "create-listing-cultivar-picker"),
        state("Cultivar selected", "create-listing-cultivar-selected"),
        state("Custom title completed", "create-listing-custom-title"),
      ]),
      step("Edit details", [
        state("Populated editor", "listings-next-edit-dialog"),
        state("Legacy editor reference", "edit-listing-dialog"),
        state("Unsaved changes", "edit-listing-unsaved-changes"),
        state("Validation error", "edit-listing-validation-error"),
      ]),
      step("Manage images", [
        state("Image section", "listings-next-edit-images"),
        state("Reordering", "listing-images-reordered"),
      ]),
      step("Organize and save", [
        state("List picker", "edit-listing-list-picker"),
        state("Saving", "edit-listing-saving"),
        state("Save success", "edit-listing-save-success"),
        state("Save failure", "edit-listing-save-failure"),
        state("Result in public catalog", "listing-availability-public-card"),
      ]),
    ],
  },
  {
    id: "new-member-setup",
    audience: "member",
    title: "Complete a New Member Dashboard",
    description: "Turn an empty account into a useful, buyer-ready catalog.",
    steps: [
      step("Orient an empty account", [
        state("Empty dashboard", "new-member-empty-dashboard"),
        state("Profile completion prompt", "new-member-profile-prompt"),
        state("Catalog completion prompt", "new-member-catalog-prompt"),
      ]),
      step("Complete setup", [
        state("Profile partially complete", "new-member-profile-progress"),
        state("First listing created", "new-member-first-listing"),
        state("First list created", "new-member-first-list"),
        state("Completed dashboard", "new-member-completed-dashboard"),
      ]),
    ],
  },
  {
    id: "find-manage-listings",
    audience: "member",
    title: "Find and Manage Listings",
    description: "Reach any listing quickly across a real catalog-sized table.",
    steps: [
      step("Orient", [
        state("Default table", "listings-next-default"),
        state("Collapsed search", "listings-next-search-collapsed"),
      ]),
      step("Search and filter", [
        state("Text query", "listings-next-query-filter"),
        state(
          "Legacy basic search reference",
          "dashboard-listings-basic-search",
        ),
        state("Advanced filters", "listings-next-advanced-filters"),
        state(
          "Legacy advanced filter reference",
          "dashboard-listings-advanced-filters",
        ),
        state("For-sale filter", "listings-next-for-sale-filter"),
        state("Photo filter", "listings-next-has-photo-filter"),
        state("List filter", "listings-next-list-filter"),
      ]),
      step("Navigate results", [
        state("Title sort", "listings-next-title-sort"),
        state("Pagination", "listings-next-pagination"),
        state("No results", "listings-next-empty-results"),
      ]),
      step("Act on a result", [
        state("Listing editor", "listings-next-edit-dialog"),
      ]),
    ],
  },
  {
    id: "listing-availability",
    audience: "member",
    title: "Publish and Price a Listing",
    description: "Control what buyers see and what is offered for sale.",
    steps: [
      step("Edit availability", [
        state("Listing editor", "listings-next-edit-dialog"),
        state("Hidden listing", "listing-availability-hidden"),
        state(
          "Published without price",
          "listing-availability-published-no-price",
        ),
        state("For sale with price", "listing-availability-for-sale"),
      ]),
      step("Verify public result", [
        state("Public listing", "representative-public-listing"),
        state("Published catalog card", "listing-availability-public-card"),
        state("Hidden listing unavailable", "public-listing-unavailable"),
        state("Updated price visible", "listing-availability-public-card"),
      ]),
    ],
  },
  {
    id: "organize-lists",
    audience: "member",
    title: "Organize Listings into Lists",
    description: "Create buyer-friendly groups of related plants.",
    steps: [
      step("Browse lists", [
        state("Lists table", "dashboard-lists"),
        state("Filtered lists", "dashboard-lists-filtered"),
      ]),
      step("Create and edit", [
        state("Create list dialog", "create-list-dialog"),
        state("Listing membership picker", "edit-listing-list-picker"),
        state("List details completed", "create-list-details-completed"),
        state("List saved", "saved-list-details"),
      ]),
      step("Verify public grouping", [
        state("Public list section", "rolling-oaks-public-catalog"),
      ]),
    ],
  },
  {
    id: "manage-list-detail",
    audience: "member",
    title: "Manage One Catalog List",
    description:
      "Edit a list and control exactly which listings buyers see in it.",
    steps: [
      step("Open and edit list", [
        state("List detail", "manage-list-detail"),
        state("Unsaved list details", "manage-list-unsaved-details"),
        state("Saving list details", "manage-list-saving"),
        state("List save success", "manage-list-save-success"),
      ]),
      step("Find list contents", [
        state("Search results", "manage-list-search"),
        state("Sorted results", "manage-list-sort"),
        state("No results", "manage-list-no-results"),
      ]),
      step("Change membership", [
        state("Add listing dialog", "manage-list-add-listing"),
        state("Remove listing confirmation", "manage-list-remove-confirmation"),
      ]),
    ],
  },
  {
    id: "manage-images",
    audience: "member",
    title: "Upload and Manage Listing Images",
    description:
      "Prepare, upload, inspect, order, and remove listing photographs.",
    steps: [
      step("Prepare upload", [
        state("Empty uploader", "listing-image-uploader"),
        state("Crop image", "listing-image-crop"),
        state("Upload in progress", "listing-image-uploading"),
        state("Upload failure", "listing-image-upload-failure"),
      ]),
      step("Manage existing images", [
        state("Multiple images", "listings-next-edit-images"),
        state("Full image preview", "listing-image-preview"),
        state("Reordered images", "listing-images-reordered"),
        state("Delete confirmation", "listing-image-delete-confirmation"),
      ]),
    ],
  },
  {
    id: "manage-profile",
    audience: "member",
    title: "Manage the Catalog Profile",
    description:
      "Keep the grower identity and public catalog presentation current.",
    steps: [
      step("Edit profile", [
        state("Profile form", "dashboard-profile"),
        state("Profile images", "profile-images-section"),
        state("Profile content editor", "profile-content-editor"),
        state("Profile image crop", "profile-image-crop"),
        state(
          "Profile image delete confirmation",
          "profile-image-delete-confirmation",
        ),
        state("Unsaved changes", "profile-unsaved-changes"),
      ]),
      step("Save and verify", [
        state("Saving", "profile-saving"),
        state("Save success", "profile-save-success"),
        state("Save failure", "profile-save-failure"),
        state("Public catalog", "rolling-oaks-public-catalog"),
        state("Second public catalog", "plant-fancy-public-catalog"),
      ]),
    ],
  },
  {
    id: "print-tags",
    audience: "member",
    title: "Design and Print Listing Tags",
    description: "Turn catalog data into useful physical tags.",
    steps: [
      step("Select and design", [
        state("Tag designer", "dashboard-tag-designer"),
        state("Listings selected", "tag-listings-selected"),
        state("Layout changed", "tag-layout-changed"),
      ]),
      step("Preview and export", [
        state("Populated preview", "tag-listings-selected"),
        state("Long or missing data", "tag-layout-changed"),
        state("Print or export", "tag-export-options"),
        state("Sheet preview", "tag-sheet-preview"),
      ]),
    ],
  },
  {
    id: "manage-membership",
    audience: "member",
    title: "Review and Manage Membership",
    description:
      "Understand membership and reach the active member billing controls.",
    steps: [
      step("Understand membership", [
        state("Membership page", "start-membership"),
        state("Checkout", "onboarding-checkout"),
      ]),
      step("Manage an active membership", [
        state("Member dashboard", "dashboard-overview"),
        state("Subscription controls", "active-membership-controls"),
      ]),
      step("Recover billing", [
        state("Upgrade required", "membership-upgrade-required"),
        state("Past-due warning", "membership-past-due"),
        state("Inactive membership", "membership-inactive"),
        state("Checkout return failure", "membership-checkout-failure"),
        state("Subscription success", "membership-subscribe-success"),
      ]),
    ],
  },
  {
    id: "destructive-actions",
    audience: "member",
    title: "Safely Remove Catalog Content",
    description:
      "Review destructive actions before removing listings, lists, links, or images.",
    steps: [
      step("Confirm removal", [
        state("Delete listing confirmation", "delete-listing-confirmation"),
        state("Delete list confirmation", "delete-list-confirmation"),
        state("Remove listing from list", "manage-list-remove-confirmation"),
        state("Delete image confirmation", "listing-image-delete-confirmation"),
        state("Unlink cultivar confirmation", "unlink-cultivar-state"),
      ]),
    ],
  },
  {
    id: "responsive-member-work",
    audience: "member",
    title: "Manage a Catalog on Mobile and iPad",
    description:
      "Use the highest-value dashboard workflows at constrained widths.",
    steps: [
      step("Mobile", [
        state("Dashboard navigation", "mobile-dashboard-navigation"),
        state("Listings table", "mobile-listings-table"),
        state("Listing editor", "mobile-listing-editor"),
      ]),
      step("iPad", [
        state("Dashboard overview", "ipad-dashboard-overview"),
        state("Listings filters", "ipad-listings-filters"),
        state("Listing editor", "ipad-listing-editor"),
        state("Image manager", "ipad-image-manager"),
      ]),
    ],
  },
];

/** @param {boolean} hermetic @param {boolean} [append] */
export function atlasProjectsForRuntime(hermetic, append = false) {
  const hermeticProjects = [
    "hermetic-new-unpaid",
    "hermetic-billing-past-due",
    "hermetic-billing-canceled",
    "hermetic-free-at-limit",
    "hermetic-profile-editor",
  ];
  if (hermetic) {
    return append
      ? hermeticProjects
      : [
          "anonymous-desktop",
          "anonymous-mobile",
          "rolling-oaks",
          "plant-fancy-gardens",
          ...hermeticProjects,
        ];
  }
  return [
    "anonymous-desktop",
    "anonymous-mobile",
    "rolling-oaks",
    "plant-fancy-gardens",
    "rolling-oaks-mobile",
    "rolling-oaks-ipad",
  ];
}

/** @param {string} title @param {AtlasState[]} states @returns {AtlasStep} */
function step(title, states) {
  return { title, states };
}

/** @param {string} title @param {string} captureName @returns {AtlasState} */
function state(title, captureName) {
  return { title, captureName };
}

/** @param {string} title @returns {AtlasState} */
function missing(title) {
  return { title, captureName: null };
}

/** @param {AtlasCapture} item */
export function normalizedCaptureName(item) {
  return item.name.startsWith(`${item.project}-`)
    ? item.name.slice(item.project.length + 1)
    : item.name;
}

/** @param {AtlasCapture[]} items @param {AtlasState} state */
export function capturesForState(items, state) {
  if (!state.captureName) return [];
  return items.filter(
    (item) => normalizedCaptureName(item) === state.captureName,
  );
}

/** @param {Pick<AtlasFlow, "steps">} flow @param {AtlasCapture[]} items */
export function flowCoverage(flow, items) {
  const states = flow.steps.flatMap((stepItem) => stepItem.states);
  const captured = states.filter(
    (stateItem) => capturesForState(items, stateItem).length > 0,
  ).length;
  return { captured, total: states.length };
}

/** @param {string} flowId @param {AtlasCapture[]} items @param {{ file: string; source: string }[]} testSources */
export function selectAtlasFlowRun(flowId, items, testSources) {
  const flow = ATLAS_FLOWS.find((candidate) => candidate.id === flowId);
  if (!flow) {
    throw new Error(
      `Unknown atlas flow: ${flowId}. Choose ${ATLAS_FLOWS.map((candidate) => candidate.id).join(", ")}.`,
    );
  }
  const captureNames = [
    ...new Set(
      flow.steps
        .flatMap((stepItem) => stepItem.states)
        .map((stateItem) => stateItem.captureName)
        .filter(Boolean),
    ),
  ];
  const files = testSources
    .filter(({ source }) =>
      captureNames.some(
        (name) => source.includes(`"${name}"`) || source.includes(`'${name}'`),
      ),
    )
    .map(({ file }) => file)
    .sort();
  const projects = [
    ...new Set(
      items
        .filter((item) => captureNames.includes(normalizedCaptureName(item)))
        .map((item) => item.project),
    ),
  ].sort();
  return { flow, captureNames, files, projects };
}

/** @param {{ url?: unknown }} item */
export function liveStateUrl(item) {
  if (typeof item.url !== "string") return null;
  try {
    const url = new URL(item.url);
    return url.protocol === "http:" &&
      ["localhost", "127.0.0.1", "::1"].includes(url.hostname)
      ? url.href
      : null;
  } catch {
    return null;
  }
}

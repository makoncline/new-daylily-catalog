interface HelpEntry {
  id: string;
  title: string;
  answer: string;
  path: string;
  terms: string[];
}

const HELP_ENTRIES: HelpEntry[] = [
  {
    id: "listing-visibility",
    title: "Listing visibility",
    answer:
      "A hidden listing stays in your dashboard but does not appear in the public catalog. Use update_listing to change its visibility.",
    path: "/dashboard/listings",
    terms: ["listing", "hidden", "status", "published", "public", "visibility"],
  },
  {
    id: "list-deletion",
    title: "Delete a list",
    answer:
      "Remove every listing from a list before you delete it. A delete link opens the dashboard confirmation; the link itself does not delete data.",
    path: "/dashboard/lists",
    terms: ["list", "delete", "remove", "empty", "membership"],
  },
  {
    id: "cultivar-link",
    title: "Link a listing to a cultivar",
    answer:
      "A cultivar link adds shared reference details to your listing. Use link_listing_to_cultivar to add a link. To replace or remove a link, open the listing editor for review.",
    path: "/dashboard/listings",
    terms: ["cultivar", "link", "reference", "ahs", "listing", "parentage"],
  },
  {
    id: "listing-photos",
    title: "Manage listing photos",
    answer:
      "Use open_dashboard with manage_listing_images and the owned listing ID to add a photo. Choose a file in the browser, adjust its square crop, and select Upload. Use reorder_images to change order. To remove a photo, open its dashboard review link.",
    path: "/dashboard/listings",
    terms: ["photo", "image", "upload", "reorder", "remove", "listing"],
  },
  {
    id: "profile-story",
    title: "Edit profile and story",
    answer:
      "Use update_profile for the title, description, and location. Use the profile image manager for photos. Read the current story with get_profile, then use open_dashboard with edit_profile_content to edit it in the rich text editor. Remote MCP does not write profile story content.",
    path: "/dashboard/profile#profile-content",
    terms: ["profile", "story", "paragraph", "content", "description"],
  },
  {
    id: "profile-photos",
    title: "Manage profile photos",
    answer:
      "Use open_dashboard with manage_profile_images to add a profile photo. Choose a file in the browser, adjust its square crop, and select Upload. Photos are attached to the profile ID. Use reorder_images to change order. To remove a photo, open its dashboard review link.",
    path: "/dashboard/profile",
    terms: ["profile", "photo", "image", "upload", "reorder", "remove"],
  },
  {
    id: "catalog-import",
    title: "Import a catalog",
    answer:
      "Use the dashboard import flow to preview and review rows before you add them to your catalog. The import requires a member action in the browser.",
    path: "/dashboard/imports",
    terms: ["import", "csv", "spreadsheet", "bulk", "catalog", "preview"],
  },
  {
    id: "membership",
    title: "Manage membership",
    answer:
      "Open the dashboard and use its membership or billing control to review plan and payment details. Membership changes require the member to use the browser flow.",
    path: "/dashboard",
    terms: ["membership", "subscription", "billing", "payment", "plan"],
  },
];

export function searchMemberHelp(query: string, baseUrl: string) {
  const tokens = query.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  const ranked = HELP_ENTRIES.map((entry) => ({
    entry,
    score: tokens.reduce(
      (score, token) =>
        score + (entry.terms.some((term) => term.includes(token)) ? 1 : 0),
      0,
    ),
  }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return ranked.map(({ entry }) => ({
    id: entry.id,
    title: entry.title,
    answer: entry.answer,
    sourceUrl: new URL(entry.path, baseUrl).toString(),
  }));
}

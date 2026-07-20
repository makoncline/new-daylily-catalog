import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CatalogImporterPage, {
  generateMetadata,
} from "@/app/(public)/catalog-importer/page";

const featureState = vi.hoisted(() => ({ discoveryEnabled: false }));
const audienceState = vi.hoisted(() => ({
  proUserIds: new Set<string>(),
  user: null as { id: string; stripeCustomerId: string | null } | null,
  userId: null as string | null,
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: () => Promise.resolve({ userId: audienceState.userId }),
}));

vi.mock("@/server/db", () => ({
  replicaDb: {
    user: {
      findUnique: () => Promise.resolve(audienceState.user),
    },
  },
}));

vi.mock("@/server/db/getProUserIdSet", () => ({
  getProUserIdSet: () => Promise.resolve(audienceState.proUserIds),
}));

vi.mock("@/config/feature-flags", () => ({
  isCatalogImporterDiscoveryEnabled: () => featureState.discoveryEnabled,
}));

vi.mock(
  "@/app/(public)/catalog-importer/_components/catalog-importer-client",
  () => ({
    CatalogImporterClient: ({
      showMembershipPrompts,
    }: {
      showMembershipPrompts: boolean;
    }) => (
      <div>
        Spreadsheet tools ·{" "}
        {showMembershipPrompts ? "Prompts on" : "Prompts off"}
      </div>
    ),
  }),
);

describe("catalog importer quiet launch", () => {
  beforeEach(() => {
    audienceState.proUserIds = new Set();
    audienceState.user = null;
    audienceState.userId = null;
  });

  it("keeps the direct page available while discovery is off", async () => {
    featureState.discoveryEnabled = false;

    render(await CatalogImporterPage());

    expect(
      screen.getByRole("heading", {
        name: "Build your daylily catalog",
      }),
    ).toBeVisible();
    expect(screen.getByText(/Spreadsheet tools · Prompts on/)).toBeVisible();
    expect(generateMetadata().robots).toEqual({
      follow: false,
      index: false,
    });
  });

  it("allows indexing only when importer discovery is enabled", () => {
    featureState.discoveryEnabled = true;

    expect(generateMetadata().robots).toBeUndefined();
  });

  it("suppresses acquisition prompts for an active Pro member", async () => {
    audienceState.userId = "clerk-pro";
    audienceState.user = {
      id: "user-pro",
      stripeCustomerId: "cus-pro",
    };
    audienceState.proUserIds = new Set(["user-pro"]);

    render(await CatalogImporterPage());

    expect(screen.getByText(/Spreadsheet tools · Prompts off/)).toBeVisible();
  });
});

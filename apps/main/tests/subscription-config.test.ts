// @vitest-environment node

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  subscriptionBillingOptionSchema,
  SUBSCRIPTION_CONFIG,
} from "@/config/subscription-config";

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return sourceFiles(entryPath);
    }

    return /\.(ts|tsx)$/.test(entry.name) ? [entryPath] : [];
  });
}

describe("subscription offer configuration", () => {
  it("keeps the billing attribution enum separate from Stripe price IDs", () => {
    expect(subscriptionBillingOptionSchema.parse("monthly")).toBe("monthly");
    expect(subscriptionBillingOptionSchema.parse("annual")).toBe("annual");
    expect(subscriptionBillingOptionSchema.safeParse("price_123").success).toBe(
      false,
    );
    expect(SUBSCRIPTION_CONFIG.COPY.CTA.CONTINUE_TO_CHECKOUT).toBe(
      "Continue to secure checkout",
    );
  });

  it("keeps trial language out of customer-facing app surfaces", () => {
    const sourceRoot = path.join(process.cwd(), "src");
    const violations = ["app", "components", "hooks"].flatMap((directory) =>
      sourceFiles(path.join(sourceRoot, directory)).flatMap((filePath) =>
        /\btrial\b/i.test(readFileSync(filePath, "utf8"))
          ? [path.relative(process.cwd(), filePath)]
          : [],
      ),
    );

    expect(violations).toEqual([]);
  });

  it("keeps the start-membership page focused on previewing before purchase", () => {
    const pageSource = readFileSync(
      path.join(process.cwd(), "src", "app", "start-membership", "page.tsx"),
      "utf8",
    );
    const marketingCopy = Object.values(
      SUBSCRIPTION_CONFIG.COPY.MARKETING,
    ).join(" ");

    expect(SUBSCRIPTION_CONFIG.COPY.MARKETING).toMatchObject({
      HERO: "Build and preview your catalog first. Choose a membership when you are ready to publish.",
      MEMBERSHIP_FAQ_ANSWER:
        "Build and preview your catalog for free. Choose a paid membership when you are ready to publish it.",
      MEMBERSHIP_FAQ_QUESTION: "When do I choose a membership?",
    });
    expect(SUBSCRIPTION_CONFIG.PATHS.NEW_USER_ONBOARDING).toBe(
      "/catalog-importer",
    );
    expect(pageSource).toContain("<SellerLandingOnboardingCta");
    expect(pageSource).toContain("Publish when you are ready");
    expect(pageSource).not.toMatch(/\btrial\b/i);
    expect(pageSource).not.toMatch(/\$\s*\d/);
    expect(marketingCopy).not.toMatch(/\btrial\b/i);
    expect(marketingCopy).not.toMatch(/[$€£]\s*\d/);
    expect(marketingCopy).not.toMatch(/\/(?:mo|month|yr|year)\b/i);
    expect(marketingCopy).not.toMatch(
      /\b(?:annual|monthly|per month|per year|yearly)\b/i,
    );
    expect(pageSource).not.toContain("getMembershipPriceDisplay");
    expect(pageSource).not.toContain("membershipPriceDisplay");
    expect(pageSource).not.toContain("getSubscriptionPriceCopy");
  });
});

// @vitest-environment node

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  getDefaultSubscriptionBillingOption,
  getStripeTrialPeriodDays,
  getSubscriptionPriceCopy,
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
  it("describes the current offer and builds its price language", () => {
    expect(SUBSCRIPTION_CONFIG.OFFER.INTRO).toEqual({
      kind: "free",
      duration: {
        count: 7,
        unit: "day",
      },
    });
    expect(getStripeTrialPeriodDays()).toBe(7);
    expect(getDefaultSubscriptionBillingOption()).toMatchObject({
      id: "annual",
      interval: "year",
      stripePriceEnvironmentVariable: "STRIPE_PRICE_ID",
    });
    expect(
      getSubscriptionPriceCopy({
        amount: "$120",
        interval: "/yr",
        monthlyEquivalent: "$10",
      }),
    ).toEqual({
      checkoutSummary: "7 days free, then $120/yr.",
      recurringPrice: "$120/yr",
      summaryWithCancellation: "7 days free, then $120/yr · Cancel anytime",
    });
  });

  it("keeps trial and dynamic price sentences out of app surfaces", () => {
    const sourceRoot = path.join(process.cwd(), "src");
    const configPath = path.join(
      sourceRoot,
      "config",
      "subscription-config.ts",
    );
    const violations = sourceFiles(sourceRoot)
      .filter((filePath) => filePath !== configPath)
      .flatMap((filePath) => {
        const source = readFileSync(filePath, "utf8");
        const hasStandaloneTrialCopy = /\btrial\b/i.test(source);
        const buildsPriceCopyDirectly =
          /membershipPriceDisplay\.(amount|interval|monthlyEquivalent)/.test(
            source,
          );

        return hasStandaloneTrialCopy || buildsPriceCopyDirectly
          ? [path.relative(process.cwd(), filePath)]
          : [];
      });

    expect(violations).toEqual([]);
  });
});

import fs from "node:fs/promises";
import path from "node:path";
import type { Page, TestInfo } from "@playwright/test";
import { test } from "./fixtures/app-fixtures";
import { withTempE2EDb } from "../../src/lib/test-utils/e2e-db";
import { seedAhsListing } from "./utils/ahs-listings";
import { deleteClerkUserByEmail } from "./utils/clerk";

const TEST_EMAIL_PREFIX = "onboarding-capture+clerk_test";
const TEST_CODE = "424242";
const CAPTURE_ROOT_DIR = path.join(
  process.cwd(),
  "tests",
  ".tmp",
  "onboarding-flow-captures",
);
type CaptureViewportMode = "below-lg" | "above-lg";

const rawCaptureViewportMode = process.env.E2E_ONBOARDING_CAPTURE_VIEWPORT;
const captureViewportMode: CaptureViewportMode =
  rawCaptureViewportMode === "below-lg" || rawCaptureViewportMode === "above-lg"
    ? rawCaptureViewportMode
    : rawCaptureViewportMode === "below-md"
      ? "below-lg"
      : rawCaptureViewportMode === "above-md"
        ? "above-lg"
        : "above-lg";
const captureViewportByMode: Record<
  CaptureViewportMode,
  { width: number; height: number }
> = {
  "above-lg": { width: 1029, height: 1100 },
  "below-lg": { width: 1019, height: 1100 },
};

const CAPTURE_DIR_NAME =
  process.env.E2E_ONBOARDING_CAPTURE_DIR ??
  `latest-${captureViewportMode}`;
const CAPTURE_RUN_INFO_PATH = path.join(
  CAPTURE_ROOT_DIR,
  CAPTURE_DIR_NAME,
  "run-info.json",
);
const shouldRunOnboardingCapture = process.env.E2E_ONBOARDING_CAPTURE === "1";
let captureDirForRun: string | null = null;
let captureIndex = 1;
let captureUserEmail: string | null = null;

function getCaptureViewportSize() {
  return captureViewportByMode[captureViewportMode];
}

function sanitizeFilePart(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

async function waitForSettledPage(page: Page) {
  await page.waitForLoadState("domcontentloaded").catch(() => undefined);
  await page.waitForTimeout(100);
}

async function saveCapture({
  page,
  label,
}: {
  page: Page;
  label: string;
}) {
  if (!captureDirForRun) {
    throw new Error("Capture directory was not initialized.");
  }

  await waitForSettledPage(page);
  const filename = `${String(captureIndex).padStart(2, "0")}-${sanitizeFilePart(label)}.png`;
  captureIndex += 1;

  console.log(`[onboarding-flow-capture] screenshot ${filename}`);
  await page.screenshot({
    path: path.join(captureDirForRun, filename),
    fullPage: true,
  });
}

async function startCaptureRun({
  testInfo,
  email,
}: {
  testInfo: TestInfo;
  email: string;
}) {
  const captureDir = path.join(CAPTURE_ROOT_DIR, CAPTURE_DIR_NAME);
  await cleanupPreviousCaptureUser();
  await fs.rm(captureDir, { recursive: true, force: true });
  await fs.mkdir(captureDir, { recursive: true });
  await fs.writeFile(
    CAPTURE_RUN_INFO_PATH,
    JSON.stringify(
      {
        testTitle: testInfo.title,
        email,
        baseURL: testInfo.project.use.baseURL,
        captureViewportMode,
        viewport: getCaptureViewportSize(),
        startedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  );

  captureDirForRun = captureDir;
  captureIndex = 1;
}

async function cleanupPreviousCaptureUser() {
  try {
    const priorRunInfo = await fs.readFile(CAPTURE_RUN_INFO_PATH, "utf8");
    const parsed = JSON.parse(priorRunInfo) as { email?: string };
    const previousEmail = parsed.email?.trim();

    if (!previousEmail?.startsWith(TEST_EMAIL_PREFIX)) {
      return;
    }

    await deleteClerkUserByEmail(previousEmail);
    console.log(`[onboarding-flow-capture] cleaned previous user ${previousEmail}`);
  } catch {
    // Ignore missing/invalid run info; this is best-effort cleanup.
  }
}

async function seedCaptureListings() {
  if (process.env.BASE_URL) {
    return;
  }

  await withTempE2EDb(async (db) => {
    await seedAhsListing({
      db,
      name: "Stella de Oro",
      hybridizer: "Jablonski",
      year: "1975",
    });
    await seedAhsListing({
      db,
      name: "Happy Returns",
      hybridizer: "Apps",
      year: "1991",
    });
  });
}

function logCaptureStep(label: string) {
  console.log(`[onboarding-flow-capture] ${label}`);
}

async function clickPrimaryAction(page: Page) {
  const primaryActionButton = page.getByTestId("start-onboarding-primary-action");
  const hasPrimaryAction = (await primaryActionButton.count()) > 0;
  if (!hasPrimaryAction) {
    return false;
  }

  const primaryButton = primaryActionButton.first();
  await primaryButton.scrollIntoViewIfNeeded();
  try {
    await primaryButton.click({ timeout: 1500 });
    return true;
  } catch {
    return false;
  }
}

async function fillInputWithRetry({
  page,
  selector,
  value,
}: {
  page: Page;
  selector: string;
  value: string;
}) {
  const input = page.locator(selector);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await input.click();
    await input.fill("");
    await input.type(value, { delay: 20 });
    if ((await input.inputValue()) === value) {
      return;
    }
    await page.waitForTimeout(120);
  }

  throw new Error(`Unable to set ${selector} to "${value}" during capture flow`);
}

async function ensureProfileSaveAdvanced(page: Page) {
  const profileEditorHeading = page.getByText("Edit your profile", {
    exact: true,
  });
  const catalogPreviewHeading = page.getByText("Catalog discovery preview", {
    exact: true,
  });
  const listingBuilderHeading = page.getByText("Edit your first listing", {
    exact: true,
  });

  for (let attempt = 0; attempt < 25; attempt += 1) {
    if (await catalogPreviewHeading.isVisible().catch(() => false)) {
      return;
    }

    if (await listingBuilderHeading.isVisible().catch(() => false)) {
      return;
    }

    if (await profileEditorHeading.isVisible().catch(() => false)) {
      await clickPrimaryAction(page);
    }

    await page.waitForTimeout(300);
  }

  throw new Error("Profile save did not advance to the next onboarding step");
}

test.describe("onboarding flow screenshot capture @capture", () => {
  test.skip(
    !shouldRunOnboardingCapture,
    "Set E2E_ONBOARDING_CAPTURE=1 to run this dev-only screenshot flow.",
  );

  test("captures each onboarding step", async ({
    page,
    homePage,
    clerkAuthModal,
    startOnboardingPage,
  }, testInfo) => {
    const testEmail = `${TEST_EMAIL_PREFIX}+${Date.now()}-${testInfo.repeatEachIndex}@gmail.com`;
    captureUserEmail = testEmail;

    await startCaptureRun({ testInfo, email: testEmail });
    await page.setViewportSize(getCaptureViewportSize());
    logCaptureStep(
      `Using viewport ${captureViewportMode} (${getCaptureViewportSize().width}x${getCaptureViewportSize().height})`,
    );
    logCaptureStep("Seeding local temp DB");
    await seedCaptureListings();

    logCaptureStep("Open home page");
    await homePage.goto();
    await page.getByRole("heading", { level: 1 }).waitFor({ state: "visible" });
    await page
      .getByRole("button", { name: "Create your catalog" })
      .first()
      .waitFor({ state: "visible" });

    logCaptureStep("Start signup from home CTA");
    await page.getByRole("button", { name: "Create your catalog" }).first().click();
    await clerkAuthModal.startSignUp();

    logCaptureStep("Submit signup email and verification code");
    await clerkAuthModal.emailInput.fill(testEmail);
    await clerkAuthModal.continueButton.click();
    await clerkAuthModal.codeInput.waitFor({ state: "visible" });

    const sendCodeWarning = page.getByText(
      "You need to send a verification code before attempting to verify.",
    );
    if (await sendCodeWarning.isVisible().catch(() => false)) {
      await clerkAuthModal.continueButton.click();
    }

    await clerkAuthModal.codeInput.type(TEST_CODE, { delay: 100 });
    await page.waitForURL(/\/onboarding/, {
      waitUntil: "domcontentloaded",
    });
    await startOnboardingPage.isReady();

    // Wait until profile data is available in onboarding before attempting save.
    logCaptureStep("Wait for onboarding profile readiness");
    await page
      .locator('[data-testid="start-onboarding-page"][data-profile-ready="true"]')
      .waitFor({ state: "visible" });

    logCaptureStep("Fill profile card fields");
    await page.locator("#garden-name").fill("Sunrise Daylily Farm");
    await page.locator("#garden-location").fill("Snohomish, WA");
    const starterOverlayCheckbox = page.locator("#starter-overlay");
    if ((await starterOverlayCheckbox.getAttribute("aria-checked")) === "true") {
      await starterOverlayCheckbox.click();
    }
    await page
      .locator('[data-testid="start-onboarding-page"] .overflow-x-auto button')
      .first()
      .click();
    await page.locator("#garden-description").fill(
      "Family-grown daylilies with seasonal shipping and collector-focused descriptions.",
    );

    await saveCapture({
      page,
      label: "onboarding-step-1-complete",
    });

    logCaptureStep("Go to profile preview");
    await ensureProfileSaveAdvanced(page);

    await page.goto("/onboarding?step=preview-profile-card", {
      waitUntil: "domcontentloaded",
    });
    await page.getByText("Catalog discovery preview", { exact: true }).waitFor({
      state: "visible",
    });

    await saveCapture({
      page,
      label: "onboarding-step-2-profile-preview",
    });

    await page.getByTestId("start-onboarding-page").waitFor({ state: "visible" });
    await page
      .getByTestId("start-onboarding-primary-action")
      .waitFor({ state: "visible" });

    logCaptureStep("Open listing builder step directly");
    await page.goto("/onboarding?step=build-listing-card", {
      waitUntil: "domcontentloaded",
    });
    await page.getByText("Edit your first listing", { exact: true }).waitFor({
      state: "visible",
    });
    await page.locator("#listing-title").waitFor({ state: "visible" });
    await page.getByText("Selected cultivar", { exact: false }).waitFor({
      state: "visible",
    });

    logCaptureStep("Fill listing card fields");
    await fillInputWithRetry({
      page,
      selector: "#listing-title",
      value: "Stella de Oro spring fan",
    });
    await fillInputWithRetry({
      page,
      selector: "#listing-price",
      value: "25",
    });
    await page.keyboard.press("Tab");
    await fillInputWithRetry({
      page,
      selector: "#listing-description",
      value: "Healthy spring fan with strong roots and bright rebloom potential.",
    });

    await saveCapture({
      page,
      label: "onboarding-step-3-listing-builder-complete",
    });

    logCaptureStep("Save listing step before preview captures");
    await clickPrimaryAction(page);
    await Promise.any([
      page.getByText("Finished listing card preview").waitFor({ state: "visible" }),
      page
        .getByRole("heading", { name: "How buyers contact you" })
        .waitFor({ state: "visible" }),
      page.getByTestId("start-membership-page").waitFor({ state: "visible" }),
    ]);

    logCaptureStep("Open listing preview step directly");
    await page.goto("/onboarding?step=preview-listing-card", {
      waitUntil: "domcontentloaded",
    });
    await page.getByText("Finished listing card preview").waitFor({
      state: "visible",
    });
    await page.getByText("Are you happy with your listing?").waitFor({
      state: "visible",
    });

    await saveCapture({
      page,
      label: "onboarding-step-4-listing-preview",
    });

    logCaptureStep("Open buyer inquiry flow step directly");
    await page.goto("/onboarding?step=preview-buyer-contact", {
      waitUntil: "domcontentloaded",
    });
    await page
      .getByRole("heading", { name: "How buyers contact you" })
      .waitFor({ state: "visible" });
    await page
      .getByRole("button", { name: "Contact this seller" })
      .waitFor({ state: "visible" });
    await page
      .getByRole("button", { name: /Contact Seller \(1 .*item\)/i })
      .waitFor({ state: "visible" });

    await saveCapture({
      page,
      label: "onboarding-step-5-buyer-inquiry-flow",
    });

    logCaptureStep("Open membership step directly");
    await page.goto("/onboarding?step=start-membership", {
      waitUntil: "domcontentloaded",
    });
    await page.getByTestId("start-membership-page").waitFor({ state: "visible" });

    await saveCapture({
      page,
      label: "onboarding-step-6-membership",
    });
  });

  test.afterAll(async () => {
    if (captureUserEmail) {
      await deleteClerkUserByEmail(captureUserEmail);
    }

    if (captureDirForRun) {
      console.log(`[onboarding-flow-capture] Screenshots saved: ${captureDirForRun}`);
    }
  });
});

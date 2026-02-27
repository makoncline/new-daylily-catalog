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
type CaptureViewportMode = "desktop" | "mobile" | "tablet" | "lg";

const captureViewportMode = (
  process.env.E2E_ONBOARDING_CAPTURE_VIEWPORT ?? "desktop"
) as CaptureViewportMode;
const captureViewportByMode: Record<
  CaptureViewportMode,
  { width: number; height: number }
> = {
  desktop: { width: 1280, height: 720 },
  lg: { width: 1440, height: 1024 },
  mobile: { width: 390, height: 844 },
  tablet: { width: 820, height: 1180 },
};

const CAPTURE_DIR_NAME =
  process.env.E2E_ONBOARDING_CAPTURE_DIR ??
  (captureViewportMode === "desktop"
    ? "latest"
    : `latest-${captureViewportMode}`);
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
  return captureViewportByMode[captureViewportMode] ?? captureViewportByMode.desktop;
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

  try {
    await primaryActionButton.click({ timeout: 1500 });
  } catch {
    await primaryActionButton.evaluate((buttonElement) => {
      buttonElement.scrollIntoView({ block: "nearest" });
      (buttonElement as HTMLButtonElement).click();
    });
  }
}

async function ensureListingBuilderVisible(page: Page) {
  const listingSelectorButton = page.locator("#ahs-listing-select");
  const listingStepTitle = page.getByText("Build your first listing", {
    exact: true,
  });
  const buildListingButton = page.getByRole("button", {
    name: "Build my first listing",
  });

  for (let attempt = 0; attempt < 5; attempt += 1) {
    if (await listingStepTitle.isVisible().catch(() => false)) {
      return;
    }

    if (await listingSelectorButton.isVisible().catch(() => false)) {
      return;
    }

    if (await buildListingButton.isVisible().catch(() => false)) {
      logCaptureStep("Step 2 visible, advancing");
      await clickPrimaryAction(page);
      await page.waitForTimeout(250);
      continue;
    }

    await page.waitForTimeout(250);
  }

  await Promise.any([
    listingStepTitle.waitFor({ state: "visible" }),
    listingSelectorButton.waitFor({ state: "visible" }),
  ]);
}

test.describe("onboarding flow screenshot capture @capture", () => {
  test.skip(
    !shouldRunOnboardingCapture,
    "Set E2E_ONBOARDING_CAPTURE=1 to run this dev-only screenshot flow.",
  );

  test("captures every onboarding step from home to dashboard", async ({
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
    await saveCapture({
      page,
      label: "home-logged-out",
    });

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
    await page.waitForURL(/\/start-onboarding/, {
      waitUntil: "domcontentloaded",
    });
    await startOnboardingPage.isReady();

    // Wait until profile data is available in onboarding before attempting save.
    logCaptureStep("Wait for onboarding profile readiness");
    await page.getByRole("button", { name: "Upload your own image" }).click();
    await page
      .getByText(/drag and drop an image here, or click to select one/i)
      .waitFor({ state: "visible" });
    await page.getByRole("button", { name: "Use a starter image" }).click();

    logCaptureStep("Fill profile card fields");
    await page.locator("#garden-name").fill("Sunrise Daylily Farm");
    await page.locator("#garden-location").fill("Snohomish, WA");
    const starterOverlayCheckbox = page.locator("#starter-overlay");
    if ((await starterOverlayCheckbox.getAttribute("aria-checked")) === "true") {
      await starterOverlayCheckbox.click();
    }
    await page.getByRole("button", { name: /bouquet/i }).first().click();
    await page.locator("#garden-description").fill(
      "Family-grown daylilies with seasonal shipping and collector-focused descriptions.",
    );

    await saveCapture({
      page,
      label: "onboarding-step-1-complete",
    });

    logCaptureStep("Go to profile preview");
    await clickPrimaryAction(page);
    await page.getByRole("button", { name: "Build my first listing" }).waitFor();

    await saveCapture({
      page,
      label: "onboarding-step-2-profile-preview",
    });

    await page.getByTestId("start-onboarding-page").waitFor({ state: "visible" });
    await page
      .getByTestId("start-onboarding-primary-action")
      .waitFor({ state: "visible" });

    logCaptureStep("Advance to listing builder");
    await clickPrimaryAction(page);
    logCaptureStep("Waiting for cultivar selector");
    await ensureListingBuilderVisible(page);
    logCaptureStep("Cultivar selector ready");

    logCaptureStep("Fill listing card fields");
    await page.locator("#ahs-listing-select").click();
    logCaptureStep("Cultivar dialog opened");
    const cultivarSearchInput = page.getByPlaceholder("Search AHS listings...");
    await cultivarSearchInput.fill("Stella");
    logCaptureStep("Waiting for cultivar option");
    const cultivarOption = page.getByRole("dialog").getByText("Stella de Oro").first();
    await cultivarOption.waitFor({ state: "visible", timeout: 8000 });
    await cultivarOption.click();
    logCaptureStep("Cultivar option selected");

    await page.getByRole("button", { name: "Listing title", exact: true }).click();
    await page.locator("#listing-title").fill("Stella de Oro spring fan");

    await page.getByRole("button", { name: "Price", exact: true }).click();
    await page.locator("#listing-price").fill("25");

    await page.getByRole("button", { name: "Description", exact: true }).click();
    await page.locator("#listing-description").fill(
      "Healthy spring fan with strong roots and bright rebloom potential.",
    );

    await saveCapture({
      page,
      label: "onboarding-step-3-listing-builder-complete",
    });

    logCaptureStep("Go to listing preview");
    await clickPrimaryAction(page);
    await page.getByRole("button", { name: "Show cultivar page example" }).waitFor();

    await saveCapture({
      page,
      label: "onboarding-step-4-listing-preview",
    });

    logCaptureStep("Go to cultivar preview");
    await clickPrimaryAction(page);
    await page.getByRole("button", { name: "Show search and filter example" }).waitFor();

    await saveCapture({
      page,
      label: "onboarding-step-5-cultivar-page-preview",
    });

    logCaptureStep("Go to search/filter preview");
    await clickPrimaryAction(page);
    await page.getByRole("button", { name: "Continue to membership" }).waitFor();

    await saveCapture({
      page,
      label: "onboarding-step-6-search-filter-demo",
    });

    logCaptureStep("Go to membership page");
    await clickPrimaryAction(page);
    await page.waitForURL(/\/start-membership/, {
      waitUntil: "domcontentloaded",
    });
    await page.getByTestId("start-membership-page").waitFor({ state: "visible" });
    await page.getByTestId("start-membership-continue").waitFor({ state: "visible" });

    await saveCapture({
      page,
      label: "start-membership",
    });

    logCaptureStep("Continue to dashboard");
    await page.getByTestId("start-membership-continue").click();
    await page.waitForURL(/\/dashboard/, {
      waitUntil: "domcontentloaded",
    });

    await saveCapture({
      page,
      label: "dashboard-after-onboarding",
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

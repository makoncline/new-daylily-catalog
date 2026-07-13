import { captureCheckpoint, test } from "./atlas-test";

test("diagnostic failure contract", async ({ page }, testInfo) => {
  test.skip(
    process.env.AGENT_ATLAS_SIMULATE_FAILURE !== "1",
    "Runs only for tooling verification.",
  );
  await page.goto("/catalogs");
  await page.evaluate(() => {
    console.error("AGENT_ATLAS_SIMULATED_CONSOLE_FAILURE");
    const image = document.createElement("img");
    image.src = "http://127.0.0.1:1/agent-atlas-simulated-request-failure.png";
    image.alt = "simulated failed request";
    document.body.append(image);
  });
  await page.waitForTimeout(250);
  await captureCheckpoint(
    page,
    testInfo,
    "diagnostic-failure-contract",
    "Deliberate tooling failure used to verify diagnostics.",
  );
});

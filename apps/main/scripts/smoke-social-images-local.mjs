// Run against a built app image: pnpm main exec node scripts/smoke-social-images-local.mjs <image>
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { setTimeout } from "node:timers/promises";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@prisma/client";
import { chromium } from "@playwright/test";
import sharp from "sharp";
import { seedIntegrationData } from "./seed-integration-data.mjs";

const image = process.argv[2];
assert.ok(image, "Pass a locally built Docker image.");
const directory = mkdtempSync(path.join(tmpdir(), "daylily-social-"));
const name = path.basename(directory);
const proxy = `${name}-proxy`;
const appRoot = path.resolve(import.meta.dirname, "..");
const databaseUrl = `file:${directory}/test.sqlite`;
const docker = (...args) =>
  execFileSync("docker", args, { encoding: "utf8", timeout: 60_000 }).trim();
let browser;

try {
  writeFileSync(`${directory}/test.sqlite`, "");
  execFileSync("pnpm", ["exec", "prisma", "db", "push"], {
    cwd: appRoot,
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: "pipe",
  });
  await seedIntegrationData(databaseUrl);
  const db = new PrismaClient({
    adapter: new PrismaLibSql(
      { url: databaseUrl },
      { timestampFormat: "unixepoch-ms" },
    ),
  });
  try {
    const titles = ["Spring 🌸", "Spring 花", "Spring \u{10ffff}"];
    for (let index = 0; index < 19; index++) {
      await db.v2AhsCultivar.create({
        data: {
          id: `social-${index}`,
          post_title: titles[index - 16] ?? `Social Bloom ${index}`,
          primary_hybridizer_name: "Test Garden",
          introduction_date: "2026",
          scape_height_in: 26,
          bloom_size_in: 5,
          bloom_season_names: "Midseason",
          ploidy_names: "Diploid",
          foliage_names: "Evergreen",
          bud_count: 25,
          branches: 5,
          color: "Pink flower with a green throat",
          image_url: "/assets/catalog-blooms.webp",
          cultivarReference: {
            create: { normalizedName: `social bloom ${index}` },
          },
        },
      });
    }
    await db.listing.update({
      where: { id: "integration-media-listing" },
      data: {
        price: 15,
        lists: { connect: { id: "integration-favorites-list" } },
      },
    });
  } finally {
    await db.$disconnect();
  }
  chmodSync(directory, 0o777);
  chmodSync(`${directory}/test.sqlite`, 0o666);
  // The app fetches real public font and emoji assets for the glyph checks.
  docker("network", "create", name);
  docker(
    "run",
    "-d",
    "--name",
    name,
    "--network",
    name,
    "--network-alias",
    "app",
    "--platform",
    "linux/amd64",
    "--cpus=2",
    "--memory=1g",
    "-v",
    `${directory}:/data`,
    "-e",
    "DATABASE_URL=file:/data/test.sqlite",
    "-e",
    "APP_BASE_URL=http://localhost:3000",
    "-e",
    "NEXT_PUBLIC_SENTRY_ENABLED=false",
    "-e",
    "NEXT_PUBLIC_POSTHOG_KEY=",
    "-e",
    "SKIP_ENV_VALIDATION=1",
    image,
  );
  writeFileSync(
    `${directory}/Caddyfile`,
    ":80 {\n reverse_proxy app:3000 {\n header_up Host localhost:3000\n }\n}\n",
  );
  docker(
    "create",
    "--name",
    proxy,
    "-p",
    "127.0.0.1::80",
    "-v",
    `${directory}/Caddyfile:/etc/caddy/Caddyfile:ro`,
    "caddy:2.11.2",
  );
  docker("network", "connect", name, proxy);
  docker("start", proxy);
  const baseUrl = `http://${docker("port", proxy, "80/tcp")}`;
  for (let attempt = 0; ; attempt++) {
    try {
      assert.equal(
        (
          await fetch(`${baseUrl}/api/runtime-config`, {
            signal: AbortSignal.timeout(2_000),
          })
        ).status,
        200,
      );
      break;
    } catch (error) {
      if (attempt === 99) throw error;
      await setTimeout(100);
    }
  }

  browser = await chromium.launch();
  const page = await browser.newPage();
  await page.route("**/*", (route) =>
    new URL(route.request().url()).origin === baseUrl
      ? route.continue()
      : route.abort(),
  );
  async function navigate() {
    const started = performance.now();
    const response = await page.goto(
      `${baseUrl}/integration-seller/existing-bloom`,
      {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      },
    );
    assert.equal(response.status(), 200);
    await page
      .getByRole("heading", { name: "Existing Bloom", exact: true })
      .waitFor();
    return performance.now() - started;
  }
  async function png(route, ttl) {
    const response = await fetch(`${baseUrl}/api/og/${route}`, {
      signal: AbortSignal.timeout(60_000),
    });
    assert.equal(response.status, 200, route);
    assert.equal(response.headers.get("content-type"), "image/png");
    assert.equal(response.headers.get("cache-control"), "public, max-age=300");
    assert.ok(
      response.headers
        .get("cloudflare-cdn-cache-control")
        .includes(`max-age=${ttl},`),
    );
    const body = Buffer.from(await response.arrayBuffer());
    const metadata = await sharp(body).metadata();
    assert.equal(metadata.width, 1200);
    assert.equal(metadata.height, 630);
    return body;
  }

  await navigate();
  const idleMs = await navigate();
  const optimized = await fetch(
    `${baseUrl}/_next/image?url=%2Fassets%2Fcatalog-blooms.webp&w=640&q=75`,
  );
  assert.equal(
    optimized.status,
    200,
    "Warm Next's image optimizer before social rendering.",
  );
  await optimized.arrayBuffer();
  const print = await png("cultivar/social-bloom-0?variant=print", 43200);
  let completed = false;
  const renders = Promise.allSettled(
    Array.from({ length: 16 }, (_, i) =>
      png(`cultivar/social-bloom-${i}`, 43200),
    ),
  ).then((results) => {
    completed = true;
    return results;
  });
  const navigationTimes = [];
  do {
    navigationTimes.push(await navigate());
  } while (!completed);
  const results = await renders;
  for (const result of results)
    assert.equal(result.status, "fulfilled", result.reason);
  const maximumMs = Math.max(...navigationTimes);
  console.log(
    JSON.stringify({
      idleMs,
      maximumMs,
      navigations: navigationTimes.length,
      images: results.length,
      peakMemoryMiB:
        Number(docker("exec", name, "cat", "/sys/fs/cgroup/memory.peak")) /
        1024 /
        1024,
    }),
  );

  const share = results[0].value;
  for (const [body, light] of [
    [print, true],
    [share, false],
  ]) {
    const pixel = await sharp(body)
      .extract({ left: 10, top: 10, width: 1, height: 1 })
      .raw()
      .toBuffer();
    assert.ok(light ? pixel[0] > 245 : pixel[0] < 40);
  }
  for (const route of [
    "catalog/integration-user",
    "listing/integration-media-listing",
    "list/integration-favorites-list",
    "for-sale/integration-user",
  ]) {
    const body = await png(route, 900);
    const stat = await sharp(body)
      .extract({ left: 40, top: 500, width: 300, height: 90 })
      .removeAlpha()
      .raw()
      .toBuffer();
    let textPixels = 0;
    for (let i = 0; i < stat.length; i += 3) {
      if (stat[i] > 200 && stat[i + 1] > 140 && stat[i + 2] < 170) textPixels++;
    }
    assert.ok(
      textPixels > 100,
      `${route}: the count or price must remain visible.`,
    );
    writeFileSync(`${directory}/${route.split("/")[0]}.png`, body);
  }
  for (const route of ["cultivar/missing", "private/integration-user"]) {
    const response = await fetch(`${baseUrl}/api/og/${route}`);
    assert.equal(response.status, 404);
    assert.equal(response.headers.has("cloudflare-cdn-cache-control"), false);
  }
  const titlePixels = [];
  for (const index of [16, 17, 18]) {
    const body = await png(`cultivar/social-bloom-${index}`, 43200);
    writeFileSync(`${directory}/glyph-${index}.png`, body);
    titlePixels.push(
      await sharp(body)
        .extract({ left: 50, top: 40, width: 500, height: 65 })
        .raw()
        .toBuffer(),
    );
  }
  for (const [index, label] of ["Emoji", "CJK"].entries()) {
    assert.notDeepEqual(
      titlePixels[index],
      titlePixels[2],
      `${label} must render its glyph, not the missing-character box.`,
    );
  }
  writeFileSync(`${directory}/share.png`, share);
  writeFileSync(`${directory}/print.png`, print);
  await page.screenshot({ path: `${directory}/page.png` });
  console.log(`Browser and PNG evidence: ${directory}`);
  assert.ok(
    maximumMs < Math.max(1500, idleMs * 4),
    "Image generation must not stall page navigation.",
  );
} catch (error) {
  try {
    console.error(docker("logs", "--tail", "30", name));
  } catch {
    /* Setup can fail before the container starts. */
  }
  throw error;
} finally {
  await browser?.close();
  for (const container of [name, proxy]) {
    try {
      docker("rm", "-f", container);
    } catch {
      /* Setup can fail before the container starts. */
    }
  }
  try {
    docker("network", "rm", name);
  } catch {
    /* Setup can fail before the network exists. */
  }
  for (const suffix of ["", "-wal", "-shm"])
    rmSync(`${directory}/test.sqlite${suffix}`, { force: true });
}

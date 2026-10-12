// @vitest-environment node
import { spawn } from "node:child_process";
import { once } from "node:events";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createServer, type RequestListener, type Server } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, expect, test } from "vitest";
import {
  assertAtlasAppReady,
  assertAtlasPortAvailable,
} from "../scripts/atlas-app-readiness.mjs";

const servers: Server[] = [];
const directories: string[] = [];
afterEach(async () => {
  await Promise.all(
    servers
      .splice(0)
      .map(
        (server) =>
          new Promise<void>((resolve) => server.close(() => resolve())),
      ),
  );
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

async function serve(handler: RequestListener) {
  const server = createServer(handler);
  servers.push(server);
  server.listen(0, "localhost");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("Missing test port.");
  return `http://localhost:${address.port}`;
}

async function runAtlas(
  baseURL: string,
  attach: boolean,
  env: Partial<NodeJS.ProcessEnv> = {},
  onStart?: () => Promise<void>,
) {
  const directory = mkdtempSync(path.join(tmpdir(), "atlas-readiness-test-"));
  directories.push(directory);
  const output = path.join(directory, "output");
  writeFileSync(output, "Keep existing captures");
  const child = spawn(
    process.execPath,
    ["scripts/run-atlas-flow.mjs", "buyer-inquiry", `--output=${output}`],
    {
      cwd: path.resolve(import.meta.dirname, ".."),
      env: {
        ...process.env,
        BASE_URL: attach ? baseURL : undefined,
        ATLAS_PORT: new URL(baseURL).port,
        DATABASE_URL: "",
        ATLAS_DATABASE_URL: "",
        ...env,
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let stderr = "";
  child.stderr.on("data", (data: Buffer) => {
    stderr += data.toString();
  });
  const exited = new Promise<number | null>((resolve) =>
    child.once("exit", resolve),
  );
  await onStart?.();
  const code = await exited;
  expect(code).toBe(1);
  expect(readFileSync(output, "utf8")).toBe("Keep existing captures");
  expect(existsSync(path.join(output, ".auth/member.json"))).toBe(false);
  return stderr;
}

test("runtime config success does not admit an app with a failed database read", async () => {
  const baseURL = await serve((request, response) => {
    response.setHeader("Content-Type", "application/json");
    if (request.url === "/api/runtime-config") response.end("{}");
    else {
      response.statusCode = 500;
      response.end(
        JSON.stringify([
          { error: { json: { message: "Database unavailable" } } },
        ]),
      );
    }
  });
  expect((await fetch(`${baseURL}/api/runtime-config`)).ok).toBe(true);
  expect(await runAtlas(baseURL, true)).toContain(
    "Public profile read returned HTTP 500",
  );
  expect((await fetch(`${baseURL}/api/runtime-config`)).ok).toBe(true);
});

test("does not capture an unowned app that takes the port during managed startup", async () => {
  let requests = 0;
  const baseURL = await serve((_request, response) => {
    requests++;
    response.end(JSON.stringify([{ result: { data: { json: [] } } }]));
  });
  const listener = servers[servers.length - 1]!;
  await new Promise<void>((resolve) => listener.close(() => resolve()));
  const directory = mkdtempSync(path.join(tmpdir(), "atlas-startup-race-"));
  directories.push(directory);
  const starting = path.join(directory, "starting");
  const capture = path.join(directory, "capture");
  writeFileSync(
    path.join(directory, "pnpm"),
    `#!/usr/bin/env node
import { writeFileSync } from "node:fs";
if (process.argv[2] === "dev") {
  writeFileSync(process.env.ATLAS_STARTING, "starting");
  setTimeout(() => process.exit(1), 3000);
} else {
  writeFileSync(process.env.ATLAS_CAPTURE_ATTEMPT, "capture");
  process.exit(1);
}
`,
    { mode: 0o755 },
  );
  const error = await runAtlas(
    baseURL,
    false,
    {
      PATH: `${directory}${path.delimiter}${process.env.PATH}`,
      DATABASE_URL: `file:${path.join(directory, "unused.sqlite")}`,
      ATLAS_STARTING: starting,
      ATLAS_CAPTURE_ATTEMPT: capture,
    },
    async () => {
      const deadline = Date.now() + 5000;
      while (!existsSync(starting) && Date.now() < deadline)
        await new Promise((resolve) => setTimeout(resolve, 25));
      expect(existsSync(starting)).toBe(true);
      listener.listen(Number(new URL(baseURL).port), "localhost");
      await once(listener, "listening");
    },
  );
  expect(error).toContain("Atlas dev server exited early");
  expect(requests).toBe(0);
  expect(existsSync(capture)).toBe(false);
  expect((await fetch(baseURL)).ok).toBe(true);
});

test("admits a successful public catalog read, including an empty catalog", async () => {
  let profiles = [{ id: "garden", title: "Test garden", slug: "test-garden" }];
  const baseURL = await serve((request, response) => {
    expect(request.url).toContain(
      "/api/trpc/public.getPublicProfiles?batch=1&input=",
    );
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify([{ result: { data: { json: profiles } } }]));
  });
  await assertAtlasAppReady(baseURL);
  profiles = [];
  await assertAtlasAppReady(baseURL);
});

test("rejects HTML, redirects, and tRPC error payloads served with HTTP success", async () => {
  let mode = "html";
  const baseURL = await serve((_request, response) => {
    if (mode === "redirect") {
      response.writeHead(302, { Location: "/sign-in" });
      response.end();
    } else if (mode === "html") response.end("<html>Sign in</html>");
    else
      response.end(
        JSON.stringify([
          { error: { json: { message: "Database unavailable" } } },
        ]),
      );
  });
  for (mode of ["html", "redirect", "error"])
    await expect(assertAtlasAppReady(baseURL)).rejects.toThrow();
});

test("refuses an occupied unmanaged port before HTTP reads or output changes", async () => {
  let requests = 0;
  const baseURL = await serve((_request, response) => {
    requests++;
    response.statusCode = 503;
    response.end("Unrelated listener");
  });
  expect(await runAtlas(baseURL, false)).toContain("is already in use");
  expect(requests).toBe(0);
  expect(await (await fetch(baseURL)).text()).toBe("Unrelated listener");
  const server = servers.pop()!;
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await assertAtlasPortAvailable(baseURL);
});

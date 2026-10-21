// @vitest-environment node
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, it } from "vitest";
import packageJson from "../package.json";

it("checks fresh routes and ignores preserved dev validators after a rename", () => {
  const appRoot = process.cwd();
  const fixture = mkdtempSync(path.join(tmpdir(), "daylily-typecheck-"));
  const fixtureApp = path.join(fixture, "apps/main");
  const route = path.join(fixtureApp, "src/app/api/before/route.ts");
  const validRoute =
    "export async function GET() { return new Response('ok'); }\n";
  const run = () => {
    const result = spawnSync("pnpm", ["run", "typecheck"], {
      cwd: fixtureApp,
      encoding: "utf8",
      timeout: 30_000,
      env: {
        PATH: process.env.PATH,
        NODE_ENV: "production",
        NEXT_TELEMETRY_DISABLED: "1",
      },
    });
    return { status: result.status, output: result.stdout + result.stderr };
  };

  try {
    mkdirSync(path.dirname(route), { recursive: true });
    mkdirSync(path.join(fixture, "packages/config/tsconfig"), {
      recursive: true,
    });
    copyFileSync(
      path.resolve(appRoot, "../../packages/config/tsconfig/base.json"),
      path.join(fixture, "packages/config/tsconfig/base.json"),
    );
    for (const name of ["tsconfig.json", "tsconfig.typecheck.json"]) {
      copyFileSync(path.join(appRoot, name), path.join(fixtureApp, name));
    }
    symlinkSync(
      path.join(appRoot, "node_modules"),
      path.join(fixtureApp, "node_modules"),
      "dir",
    );
    symlinkSync(
      path.resolve(appRoot, "../../node_modules"),
      path.join(fixture, "node_modules"),
      "dir",
    );
    writeFileSync(
      path.join(fixtureApp, "package.json"),
      JSON.stringify({
        private: true,
        scripts: { typecheck: packageJson.scripts.typecheck },
      }),
    );
    writeFileSync(route, validRoute);
    const fresh = run();
    expect(fresh, fresh.output).toMatchObject({ status: 0 });

    writeFileSync(
      route,
      "export async function GET(request: number) { return new Response(String(request)); }\n",
    );
    const invalid = run();
    expect(invalid.status, invalid.output).toBe(2);
    expect(invalid.output).toContain("validator.ts");

    writeFileSync(route, validRoute);
    const devTypes = path.join(fixtureApp, ".next/dev/types");
    mkdirSync(devTypes, { recursive: true });
    const staleValidator =
      "export type StaleRoute = typeof import('../../../src/app/api/before/route.js');\n";
    writeFileSync(path.join(devTypes, "validator.ts"), staleValidator);
    renameSync(path.dirname(route), path.join(fixtureApp, "src/app/api/after"));
    const renamed = run();
    expect(renamed, renamed.output).toMatchObject({ status: 0 });
    expect(readFileSync(path.join(devTypes, "validator.ts"), "utf8")).toBe(
      staleValidator,
    );
    expect(
      readFileSync(path.join(fixtureApp, ".next/types/validator.ts"), "utf8"),
    ).toContain("/api/after");
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
}, 90_000);

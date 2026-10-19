import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  mkdtempSync,
  mkdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, expect, it } from "vitest";

const appRoot = process.cwd();
const fixtureRoot = mkdtempSync(
  path.join(tmpdir(), "daylily-server-boundary-"),
);

afterAll(() => rmSync(fixtureRoot, { recursive: true, force: true }));

it("rejects a client import of the real database entry point", () => {
  mkdirSync(path.join(fixtureRoot, "app"));
  symlinkSync(
    path.join(appRoot, "node_modules"),
    path.join(fixtureRoot, "node_modules"),
    "dir",
  );
  writeFileSync(
    path.join(fixtureRoot, "package.json"),
    JSON.stringify({ private: true, type: "module" }),
  );
  writeFileSync(
    path.join(fixtureRoot, "app/layout.tsx"),
    "export default function Layout({ children }: { children: React.ReactNode }) { return <html><body>{children}</body></html>; }\n",
  );
  copyFileSync(
    path.join(appRoot, "src/server/db.ts"),
    path.join(fixtureRoot, "app/db.ts"),
  );
  writeFileSync(
    path.join(fixtureRoot, "app/page.tsx"),
    '"use client";\nimport { db } from "./db";\nexport default function Page() { return <main>{Boolean(db)}</main>; }\n',
  );

  let output = "";
  try {
    execFileSync(
      process.execPath,
      [
        path.join(appRoot, "node_modules/next/dist/bin/next"),
        "build",
        "--webpack",
      ],
      {
        cwd: fixtureRoot,
        encoding: "utf8",
        env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
        stdio: "pipe",
        timeout: 30_000,
      },
    );
  } catch (error) {
    const buildError = error as { stdout?: string; stderr?: string };
    output = `${buildError.stdout ?? ""}\n${buildError.stderr ?? ""}`;
  }

  expect(output).toContain('depends on "server-only"');
  expect(output).toContain("Client Component");
  expect(output).toContain("./app/db.ts");
}, 35_000);

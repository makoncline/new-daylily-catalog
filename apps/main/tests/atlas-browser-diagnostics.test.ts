// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  assertNoUnexpectedBrowserDiagnostics,
  browserDiagnosticsFromServerLog,
  CLERK_DEVELOPMENT_KEY_WARNING,
  diagnosticLineFromPlaywrightConsole,
  unexpectedBrowserDiagnostics,
} from "../scripts/atlas-browser-diagnostics.mjs";

const clerkLine = `@daylily-catalog/main:dev: [browser] ${CLERK_DEVELOPMENT_KEY_WARNING} (https://clerk.example/clerk.browser.js:1:2)`;

describe("Atlas browser diagnostic gate", () => {
  it("records Playwright warnings and errors but ignores ordinary console output", () => {
    expect(diagnosticLineFromPlaywrightConsole("warning", "warning")).toBe(
      "[browser] warning",
    );
    expect(diagnosticLineFromPlaywrightConsole("error", "error")).toBe(
      "[browser] error",
    );
    expect(diagnosticLineFromPlaywrightConsole("log", "ordinary output")).toBe(
      undefined,
    );
  });

  it("extracts forwarded browser diagnostics and ignores ordinary server logs", () => {
    expect(
      browserDiagnosticsFromServerLog(
        [
          "GET /dashboard/profile 200",
          clerkLine,
          "@daylily-catalog/main:dev: [browser] hydration warning",
        ].join("\n"),
      ).map(({ message }) => message),
    ).toEqual([
      `${CLERK_DEVELOPMENT_KEY_WARNING} (https://clerk.example/clerk.browser.js:1:2)`,
      "hydration warning",
    ]);
  });

  it("allows only Clerk's expected development-key warning", () => {
    const serverLog = ["GET /dashboard/profile 200", clerkLine, clerkLine].join(
      "\n",
    );

    expect(unexpectedBrowserDiagnostics(serverLog)).toEqual([]);
    expect(assertNoUnexpectedBrowserDiagnostics(serverLog)).toBe(true);
  });

  it("rejects every other browser diagnostic alongside the Clerk warning", () => {
    const lcp =
      '@daylily-catalog/main:dev: [browser] Image with src "profile.jpg" was detected as the Largest Contentful Paint (LCP).';
    const hydration =
      "@daylily-catalog/main:dev: [browser] In HTML, <div> cannot be a descendant of <p>.";
    const serverLog = [clerkLine, lcp, hydration].join("\n");

    expect(
      unexpectedBrowserDiagnostics(serverLog).map(({ line }) => line),
    ).toEqual([lcp, hydration]);
    expect(() => assertNoUnexpectedBrowserDiagnostics(serverLog)).toThrow(
      /Largest Contentful Paint[\s\S]*cannot be a descendant/,
    );
  });

  it("rejects a lookalike Clerk warning outside the exact allowlist", () => {
    const lookalike = `${clerkLine} unexpected suffix`;

    expect(() => assertNoUnexpectedBrowserDiagnostics(lookalike)).toThrow(
      "Unexpected browser diagnostics",
    );
  });
});

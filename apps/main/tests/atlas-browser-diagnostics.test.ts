// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  assertNoUnexpectedBrowserDiagnostics,
  browserDiagnosticsFromServerLog,
  CHROMIUM_DOCUMENT_404_DIAGNOSTIC,
  CLERK_DEVELOPMENT_KEY_WARNING,
  diagnosticLineFromPlaywrightConsole,
  unexpectedBrowserDiagnostics,
} from "../scripts/atlas-browser-diagnostics.mjs";

const clerkLine = `@daylily-catalog/main:dev: [browser] ${CLERK_DEVELOPMENT_KEY_WARNING} (https://clerk.example/clerk.browser.js:1:2)`;

describe("Atlas browser diagnostic gate", () => {
  it("reads the current browser and forwarded console envelopes", () => {
    const envelope = {
      event: "console_message",
      level: "warn",
      message: CLERK_DEVELOPMENT_KEY_WARNING,
      details: [],
    };
    const direct = diagnosticLineFromPlaywrightConsole(
      "warning",
      JSON.stringify(envelope),
    );
    const forwarded = `@daylily-catalog/main:dev: ${JSON.stringify({
      ...envelope,
      message: "[browser]",
      details: [
        CLERK_DEVELOPMENT_KEY_WARNING,
        "(https://clerk.example/clerk.browser.js:1:2)",
      ],
    })}`;
    expect(
      assertNoUnexpectedBrowserDiagnostics(`${direct}\n${forwarded}`),
    ).toBe(true);

    for (const record of [
      { ...envelope, message: "Hydration warning" },
      { ...envelope, level: "error" },
      { ...envelope, event: "other_event" },
      { ...envelope, details: ["unexpected suffix"] },
      { ...envelope, details: null },
      { ...envelope, message: `${CLERK_DEVELOPMENT_KEY_WARNING} changed` },
      { message: CLERK_DEVELOPMENT_KEY_WARNING },
    ]) {
      const line = `[browser] ${JSON.stringify(record)}`;
      expect(() => assertNoUnexpectedBrowserDiagnostics(line)).toThrow(line);
    }
    expect(() =>
      assertNoUnexpectedBrowserDiagnostics('[browser] {"message":'),
    ).toThrow("Unexpected browser diagnostics");
    expect(() =>
      assertNoUnexpectedBrowserDiagnostics('@dev: {"message":"[browser]",'),
    ).toThrow("Unexpected browser diagnostics");
    const structured404 = `[browser] ${JSON.stringify({ ...envelope, level: "error", message: CHROMIUM_DOCUMENT_404_DIAGNOSTIC })}`;
    expect(() =>
      assertNoUnexpectedBrowserDiagnostics(structured404, [
        CHROMIUM_DOCUMENT_404_DIAGNOSTIC,
      ]),
    ).toThrow(structured404);
  });
  it("records Playwright warnings and errors but ignores ordinary console output", () => {
    expect(diagnosticLineFromPlaywrightConsole("warning", "warning")).toBe(
      "[browser] warning",
    );
    expect(diagnosticLineFromPlaywrightConsole("error", "error")).toBe(
      "[browser:error] error",
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

  it("rejects browser errors even when their text or JSON claims the allowed warning", () => {
    for (const message of [
      CLERK_DEVELOPMENT_KEY_WARNING,
      JSON.stringify({
        event: "console_message",
        level: "warn",
        message: CLERK_DEVELOPMENT_KEY_WARNING,
        details: [],
      }),
    ]) {
      const line = diagnosticLineFromPlaywrightConsole("error", message)!;
      expect(() => assertNoUnexpectedBrowserDiagnostics(line)).toThrow(line);
    }
    const native404 = diagnosticLineFromPlaywrightConsole(
      "error",
      CHROMIUM_DOCUMENT_404_DIAGNOSTIC,
    )!;
    expect(
      assertNoUnexpectedBrowserDiagnostics(native404, [
        CHROMIUM_DOCUMENT_404_DIAGNOSTIC,
      ]),
    ).toBe(true);
    expect(
      unexpectedBrowserDiagnostics(`${native404}\n${native404}`, [
        CHROMIUM_DOCUMENT_404_DIAGNOSTIC,
      ]),
    ).toHaveLength(1);
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

  it("consumes exactly one explicitly expected document 404 diagnostic", () => {
    const document404 = CHROMIUM_DOCUMENT_404_DIAGNOSTIC;
    const line = `@daylily-catalog/main:dev: [browser] ${document404}`;

    expect(unexpectedBrowserDiagnostics(line, [document404])).toEqual([]);
    expect(unexpectedBrowserDiagnostics(line)).toEqual([
      { line, message: document404 },
    ]);
    expect(
      unexpectedBrowserDiagnostics([line, line].join("\n"), [document404]),
    ).toEqual([{ line, message: document404 }]);
  });

  it("rejects a lookalike Clerk warning outside the exact allowlist", () => {
    const lookalike = `${clerkLine} unexpected suffix`;

    expect(() => assertNoUnexpectedBrowserDiagnostics(lookalike)).toThrow(
      "Unexpected browser diagnostics",
    );
  });
});

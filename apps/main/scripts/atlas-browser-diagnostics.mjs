const BROWSER_DIAGNOSTIC_MARKER = "[browser] ";
const BROWSER_ERROR_MARKER = "[browser:error] ";

/** @typedef {{ line: string; message: string; level?: string; structured?: boolean }} BrowserDiagnostic */

export const CLERK_DEVELOPMENT_KEY_WARNING =
  "Clerk: Clerk has been loaded with development keys. Development instances have strict usage limits and should not be used when deploying your application to production. Learn more: https://clerk.com/docs/deployments/overview";

export const CHROMIUM_DOCUMENT_404_DIAGNOSTIC =
  "Failed to load resource: the server responded with a status of 404 (Not Found)";

/**
 * @param {string} type
 * @param {string} message
 */
export function diagnosticLineFromPlaywrightConsole(type, message) {
  if (type !== "warning" && type !== "error") return undefined;
  return `${type === "error" ? BROWSER_ERROR_MARKER : BROWSER_DIAGNOSTIC_MARKER}${message}`;
}

/**
 * @param {string} serverLog
 * @returns {BrowserDiagnostic[]}
 */
export function browserDiagnosticsFromServerLog(serverLog) {
  return serverLog.split(/\r?\n/).flatMap(
    /** @returns {BrowserDiagnostic[]} */ (line) => {
      const isError = line.includes(BROWSER_ERROR_MARKER);
      const marker = isError ? BROWSER_ERROR_MARKER : BROWSER_DIAGNOSTIC_MARKER;
      const markerIndex = line.indexOf(marker);
      const forwarded = line.includes('"[browser]"');
      if (markerIndex === -1 && !forwarded) return [];
      const message =
        markerIndex === -1
          ? line.slice(line.indexOf("{"))
          : line.slice(markerIndex + marker.length);
      if (message.startsWith("{")) {
        try {
          const record = JSON.parse(message);
          if (
            record.event === "console_message" &&
            typeof record.level === "string" &&
            typeof record.message === "string" &&
            Array.isArray(record.details) &&
            record.details.every(
              /** @param {unknown} detail */ (detail) =>
                typeof detail === "string",
            )
          ) {
            const parts =
              record.message === "[browser]"
                ? record.details
                : [record.message, ...record.details];
            return [
              {
                line,
                message: parts.join(" "),
                level: isError ? "error" : record.level,
                structured: true,
              },
            ];
          }
        } catch {
          // Keep malformed browser output so the diagnostic gate rejects it.
        }
      }

      return [isError ? { line, message, level: "error" } : { line, message }];
    },
  );
}

/** @param {BrowserDiagnostic} diagnostic */
function isAllowedBrowserDiagnostic({ message, level }) {
  if (level !== undefined && level !== "warn") return false;
  if (message === CLERK_DEVELOPMENT_KEY_WARNING) return true;
  if (!message.startsWith(CLERK_DEVELOPMENT_KEY_WARNING)) return false;
  const sourceSuffix = message.slice(CLERK_DEVELOPMENT_KEY_WARNING.length);
  return /^\s\([^)\n]+\)$/.test(sourceSuffix);
}

/**
 * @param {string} serverLog
 * @param {string[]} [expectedMessages]
 * @returns {BrowserDiagnostic[]}
 */
export function unexpectedBrowserDiagnostics(serverLog, expectedMessages = []) {
  const expectedCounts = new Map();
  for (const message of expectedMessages) {
    expectedCounts.set(message, (expectedCounts.get(message) ?? 0) + 1);
  }

  return browserDiagnosticsFromServerLog(serverLog).filter((diagnostic) => {
    if (isAllowedBrowserDiagnostic(diagnostic)) return false;

    const expectedCount = !diagnostic.structured
      ? (expectedCounts.get(diagnostic.message) ?? 0)
      : 0;
    if (expectedCount === 0) return true;
    expectedCounts.set(diagnostic.message, expectedCount - 1);
    return false;
  });
}

/**
 * @param {string} serverLog
 * @param {string[]} [expectedMessages]
 */
export function assertNoUnexpectedBrowserDiagnostics(
  serverLog,
  expectedMessages = [],
) {
  const unexpected = unexpectedBrowserDiagnostics(serverLog, expectedMessages);
  if (unexpected.length === 0) return true;

  throw new Error(
    `Unexpected browser diagnostics in Atlas:\n${unexpected
      .map(({ line }) => line)
      .join("\n")}`,
  );
}

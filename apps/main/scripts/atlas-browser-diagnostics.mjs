const BROWSER_DIAGNOSTIC_MARKER = "[browser] ";

/** @typedef {{ line: string; message: string }} BrowserDiagnostic */

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
  return `${BROWSER_DIAGNOSTIC_MARKER}${message}`;
}

/**
 * @param {string} serverLog
 * @returns {BrowserDiagnostic[]}
 */
export function browserDiagnosticsFromServerLog(serverLog) {
  return serverLog.split(/\r?\n/).flatMap((line) => {
    const markerIndex = line.indexOf(BROWSER_DIAGNOSTIC_MARKER);
    if (markerIndex === -1) return [];

    return [
      {
        line,
        message: line.slice(markerIndex + BROWSER_DIAGNOSTIC_MARKER.length),
      },
    ];
  });
}

/** @param {BrowserDiagnostic} diagnostic */
function isAllowedBrowserDiagnostic({ message }) {
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

    const expectedCount = expectedCounts.get(diagnostic.message) ?? 0;
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

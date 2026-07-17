const BROWSER_DIAGNOSTIC_MARKER = "[browser] ";

/** @typedef {{ line: string; message: string }} BrowserDiagnostic */

export const CLERK_DEVELOPMENT_KEY_WARNING =
  "Clerk: Clerk has been loaded with development keys. Development instances have strict usage limits and should not be used when deploying your application to production. Learn more: https://clerk.com/docs/deployments/overview";

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
 * @returns {BrowserDiagnostic[]}
 */
export function unexpectedBrowserDiagnostics(serverLog) {
  return browserDiagnosticsFromServerLog(serverLog).filter(
    (diagnostic) => !isAllowedBrowserDiagnostic(diagnostic),
  );
}

/** @param {string} serverLog */
export function assertNoUnexpectedBrowserDiagnostics(serverLog) {
  const unexpected = unexpectedBrowserDiagnostics(serverLog);
  if (unexpected.length === 0) return true;

  throw new Error(
    `Unexpected browser diagnostics in Atlas server log:\n${unexpected
      .map(({ line }) => line)
      .join("\n")}`,
  );
}

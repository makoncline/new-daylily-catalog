/**
 * AHS V2 rollout switch.
 *
 * Baseline-cutover cleanup:
 * - Remove session override helpers/events.
 * - Replace `isCultivarReferenceLinkingEnabled()` with `return true`.
 * - Remove `NEXT_PUBLIC_CULTIVAR_REFERENCE_LINKING_ENABLED` from env/docs.
 */
export const CULTIVAR_REFERENCE_LINKING_OVERRIDE_STORAGE_KEY =
  "cultivar-reference-linking-override";
export const CULTIVAR_REFERENCE_LINKING_OVERRIDE_CHANGED_EVENT =
  "cultivar-reference-linking-override-changed";

export function getCultivarReferenceLinkingEnvDefault(): boolean {
  return process.env.NEXT_PUBLIC_CULTIVAR_REFERENCE_LINKING_ENABLED === "true";
}

export function getCultivarReferenceLinkingOverride(): boolean | null {
  if (typeof window === "undefined") {
    return null;
  }

  const value = window.sessionStorage.getItem(
    CULTIVAR_REFERENCE_LINKING_OVERRIDE_STORAGE_KEY,
  );
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  return null;
}

export function setCultivarReferenceLinkingOverride(
  value: boolean | null,
): void {
  if (typeof window === "undefined") {
    return;
  }

  if (value === null) {
    window.sessionStorage.removeItem(
      CULTIVAR_REFERENCE_LINKING_OVERRIDE_STORAGE_KEY,
    );
    window.dispatchEvent(
      new Event(CULTIVAR_REFERENCE_LINKING_OVERRIDE_CHANGED_EVENT),
    );
    return;
  }

  window.sessionStorage.setItem(
    CULTIVAR_REFERENCE_LINKING_OVERRIDE_STORAGE_KEY,
    String(value),
  );

  window.dispatchEvent(
    new Event(CULTIVAR_REFERENCE_LINKING_OVERRIDE_CHANGED_EVENT),
  );
}

export function isCultivarReferenceLinkingEnabled(): boolean {
  const override = getCultivarReferenceLinkingOverride();
  return override ?? getCultivarReferenceLinkingEnvDefault();
}

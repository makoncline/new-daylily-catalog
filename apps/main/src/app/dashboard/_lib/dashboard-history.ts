// Track only entries made during this dashboard session. Router data is opaque.
export const DASHBOARD_ENTRY = "__daylilyDashboardEntry";

export interface DashboardEntry {
  scope: string;
  id: string;
  position: number;
  url: string;
}

export interface DashboardHistoryChange {
  type: "push" | "replace" | "before-traverse" | "traverse";
  from: DashboardEntry | null;
  entry: DashboardEntry | null;
}

function readEntry(state: unknown, url: string): DashboardEntry | null {
  if (!state || typeof state !== "object" || !(DASHBOARD_ENTRY in state))
    return null;
  const value: unknown = state[DASHBOARD_ENTRY];
  if (
    !value ||
    typeof value !== "object" ||
    !("scope" in value) ||
    typeof value.scope !== "string" ||
    !("id" in value) ||
    typeof value.id !== "string" ||
    !("position" in value) ||
    typeof value.position !== "number" ||
    !Number.isSafeInteger(value.position)
  )
    return null;
  return { scope: value.scope, id: value.id, position: value.position, url };
}

function withEntry(state: unknown, entry: DashboardEntry) {
  if (
    state !== null &&
    state !== undefined &&
    (typeof state !== "object" || Array.isArray(state))
  ) {
    throw new Error("Dashboard history requires object state.");
  }
  const { scope, id, position } = entry;
  return { ...state, [DASHBOARD_ENTRY]: { scope, id, position } };
}

export function trackDashboardHistory(
  onChange: (change: DashboardHistoryChange) => void,
) {
  const history = window.history;
  // Restore these exact functions on cleanup. Calls below use .call(history).
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const push = history.pushState;
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const replace = history.replaceState;
  let current = readEntry(history.state, location.href) ?? {
    scope: crypto.randomUUID(),
    id: crypto.randomUUID(),
    position: 0,
    url: location.href,
  };
  let scope = current.scope;
  let entry: DashboardEntry | null = current;
  let writing = false;
  let nativeChange: "push" | "replace" | null = null;
  let nativeSourceState: unknown = null;
  let stopped = false;
  const notifyWrite = (change: DashboardHistoryChange) => {
    // Next can write history in an insertion effect. Notify after its commit.
    queueMicrotask(() => {
      if (!stopped) onChange(change);
    });
  };

  replace.call(history, withEntry(history.state, current), "");

  const pushState: History["pushState"] = (state: unknown, title, url) => {
    if (!entry)
      throw new Error("Cannot push from an untracked dashboard entry.");
    current = {
      scope,
      id: crypto.randomUUID(),
      position: entry.position + 1,
      url: url == null ? location.href : new URL(url, location.href).href,
    };
    writing = true;
    try {
      push.call(history, withEntry(state, current), title, url);
    } finally {
      writing = false;
    }
    const from = entry;
    entry = { ...current, url: location.href };
    notifyWrite({ type: "push", from, entry });
  };
  const replaceState: History["replaceState"] = (
    state: unknown,
    title,
    url,
  ) => {
    // The router can replace a traversed entry before our popstate listener.
    const replaced = readEntry(history.state, location.href);
    entry = replaced?.scope === scope ? replaced : null;
    writing = true;
    try {
      replace.call(
        history,
        entry ? withEntry(state, entry) : state,
        title,
        url,
      );
    } finally {
      writing = false;
    }
    const from = entry;
    if (entry) entry = { ...entry, url: location.href };
    notifyWrite({ type: "replace", from, entry });
  };

  // Native hash changes bypass pushState. Use the public navigation type only.
  // Safari entry keys are not used.
  const navigation = (window as Window & { navigation?: EventTarget })
    .navigation;
  const onNavigate = (event: Event) => {
    if (writing) return;
    const type = (event as Event & { navigationType: string }).navigationType;
    nativeChange =
      !writing && (type === "push" || type === "replace") ? type : null;
    nativeSourceState = nativeChange ? history.state : null;
    if (
      type === "traverse" &&
      (event as Event & { destination: { sameDocument: boolean } }).destination
        .sameDocument
    ) {
      onChange({ type: "before-traverse", from: entry, entry });
    }
  };
  const onPopState = (event: PopStateEvent) => {
    const from = entry;
    const nativeType = nativeChange;
    const sourceState = nativeSourceState;
    nativeChange = null;
    nativeSourceState = null;
    if (nativeType && from) {
      entry = {
        ...from,
        url: location.href,
        ...(nativeType === "push"
          ? { id: crypto.randomUUID(), position: from.position + 1 }
          : {}),
      };
      // A native hash entry has no router state. Keep the source state opaque.
      replace.call(history, withEntry(sourceState, entry), "");
      onChange({ type: nativeType, from, entry });
      return;
    }
    const target = readEntry(event.state, location.href);
    entry = target?.scope === scope ? target : null;
    onChange({ type: "traverse", from, entry });
  };

  history.pushState = pushState;
  history.replaceState = replaceState;
  navigation?.addEventListener("navigate", onNavigate);
  window.addEventListener("popstate", onPopState, true);

  return {
    current: () => {
      const active = readEntry(history.state, location.href);
      return active?.scope === scope ? active : null;
    },
    startTrackingHere: () => {
      // Start a new known segment. Do not assign an old entry a guessed offset.
      scope = crypto.randomUUID();
      entry = {
        scope,
        id: crypto.randomUUID(),
        position: 0,
        url: location.href,
      };
      replace.call(history, withEntry(history.state, entry), "");
      onChange({ type: "replace", from: null, entry });
    },
    goTo: (target: DashboardEntry) => {
      const active = readEntry(history.state, location.href);
      entry = active?.scope === scope ? active : null;
      if (entry?.scope !== target.scope)
        throw new Error("The destination history position is not known.");
      if (entry.id === target.id) return;
      const distance = target.position - entry.position;
      if (distance === 0)
        throw new Error("Two history entries have the same position.");
      history.go(distance);
    },
    stop: () => {
      stopped = true;
      if (history.pushState === pushState) history.pushState = push;
      if (history.replaceState === replaceState) history.replaceState = replace;
      navigation?.removeEventListener("navigate", onNavigate);
      window.removeEventListener("popstate", onPopState, true);
    },
  };
}

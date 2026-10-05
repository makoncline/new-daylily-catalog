"use client";

type HasUpdatedAt = {
  updatedAt: Date;
};

type HasSyncPageCursor = {
  id: string;
};

export interface DashboardSyncPageCursor {
  id: string;
}

export interface DashboardSyncPageInput {
  cursor?: DashboardSyncPageCursor;
  limit?: number;
  since: string | null;
}

export function logDashboardSyncTiming(
  label: string,
  startedAt: number,
  details?: Record<string, string | number | boolean | null | undefined>,
) {
  const now = typeof performance === "undefined" ? null : performance.now();
  const durationMs = now === null ? null : now - startedAt;
  const payload = {
    label,
    atMs: now === null ? null : Number(now.toFixed(1)),
    durationMs: durationMs === null ? null : Number(durationMs.toFixed(1)),
    ...details,
  };

  console.info("[dashboard-db-sync]", JSON.stringify(payload));
}

export function writeCursorFromRows(args: {
  cursorStorageKey: string;
  rows: readonly HasUpdatedAt[];
}) {
  if (args.rows.length === 0) return;

  let max = args.rows[0]!.updatedAt;
  for (let i = 1; i < args.rows.length; i++) {
    const next = args.rows[i]!.updatedAt;
    if (next > max) max = next;
  }

  localStorage.setItem(args.cursorStorageKey, max.toISOString());
}

export async function fetchDashboardSyncPages<
  T extends HasSyncPageCursor,
>(args: {
  fetchPage: (input: DashboardSyncPageInput) => Promise<readonly T[]>;
  label?: string;
  pageSize?: number;
  since: string | null;
}) {
  const startedAt = performance.now();
  const pageSize = args.pageSize ?? 100;
  const rows: T[] = [];
  let cursor: DashboardSyncPageCursor | undefined;

  if (args.since !== null) {
    const page = [...(await args.fetchPage({ since: args.since }))];
    if (args.label) {
      logDashboardSyncTiming(args.label, startedAt, {
        mode: "incremental",
        rows: page.length,
      });
    }
    return page;
  }

  let pages = 0;
  for (;;) {
    const page = await args.fetchPage({
      cursor,
      limit: pageSize,
      since: args.since,
    });
    pages += 1;

    rows.push(...page);

    if (page.length < pageSize) {
      if (args.label) {
        logDashboardSyncTiming(args.label, startedAt, {
          mode: "full",
          pages,
          rows: rows.length,
        });
      }
      return rows;
    }

    const last = page[page.length - 1]!;
    if (cursor?.id === last.id) {
      throw new Error("Dashboard sync cursor did not advance");
    }

    cursor = { id: last.id };
  }
}

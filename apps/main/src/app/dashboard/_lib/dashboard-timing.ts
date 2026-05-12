"use client";

type DashboardTimingDetails = Record<
  string,
  string | number | boolean | null | undefined
>;

export function logDashboardTiming(
  label: string,
  details?: DashboardTimingDetails,
) {
  console.info(
    "[dashboard-timing]",
    JSON.stringify({
      label,
      atMs: Number(performance.now().toFixed(1)),
      ...details,
    }),
  );
}

import type { StorefrontSnapshotStatus } from "@/types/storefront";

type StorefrontStatusLoader = () => Promise<StorefrontSnapshotStatus>;
type InquiryReadinessChecker = () => void;
type Clock = () => Date;

const staleSnapshotAgeSeconds = 26 * 60 * 60;
const allowedFutureSkewSeconds = 5 * 60;

const noStoreHeaders = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8",
};

export function createHealthHandler(
  loadStatus: StorefrontStatusLoader,
  checkInquiryReadiness: InquiryReadinessChecker,
  now: Clock = () => new Date(),
) {
  return async function healthHandler() {
    try {
      checkInquiryReadiness();
      const status = await loadStatus();
      const rawAgeSeconds =
        status.source === "fixture"
          ? 0
          : Math.floor(
              (now().getTime() - Date.parse(status.snapshot.generatedAt)) /
                1_000,
            );
      if (rawAgeSeconds < -allowedFutureSkewSeconds) {
        throw new Error("Snapshot generatedAt is too far in the future.");
      }
      const ageSeconds = Math.max(0, rawAgeSeconds);
      const freshness =
        ageSeconds > staleSnapshotAgeSeconds ? "stale" : "fresh";
      const degraded = status.degraded || freshness === "stale";

      return Response.json(
        {
          ok: true,
          status: degraded ? "degraded" : "ready",
          degraded,
          source: status.source,
          version: status.snapshot.version,
          freshness,
          ageSeconds,
          generatedAt: status.snapshot.generatedAt,
          checkedAt: status.checkedAt,
        },
        { status: 200, headers: noStoreHeaders },
      );
    } catch {
      return Response.json(
        {
          ok: false,
          status: "unavailable",
          degraded: false,
          source: "none",
        },
        { status: 503, headers: noStoreHeaders },
      );
    }
  };
}

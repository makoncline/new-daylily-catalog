const WINDOW_MS = 60_000;
const REQUESTS_PER_WINDOW = 120;

type Bucket = { count: number; resetAt: number };

const globalBudget = globalThis as typeof globalThis & {
  daylilyMemberRequestBudget?: Map<string, Bucket>;
};
const buckets: Map<string, Bucket> =
  (globalBudget.daylilyMemberRequestBudget ??= new Map<string, Bucket>());

export function consumeMemberRequestBudget(
  clientId: string,
  clerkUserId: string,
) {
  const now = Date.now();
  if (buckets.size > 1_000) {
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
  }
  const key = `${clientId}:${clerkUserId}`;
  const previous = buckets.get(key);
  const bucket =
    previous && previous.resetAt > now
      ? previous
      : { count: 0, resetAt: now + WINDOW_MS };
  if (bucket.count >= REQUESTS_PER_WINDOW) return false;
  bucket.count += 1;
  buckets.set(key, bucket);
  return true;
}

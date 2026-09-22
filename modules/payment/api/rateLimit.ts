// Best-effort in-memory sliding-window limiter for public write endpoints (checkout).
// Per-process only — resets on deploy/restart and does not coordinate across multiple
// server instances. Good enough for this app's current single-instance scale; if the
// app ever runs behind multiple instances, move this to a shared store (Redis, DB row).
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 20;
const MAX_TRACKED_KEYS = 5_000;

const hits = new Map<string, number[]>();

export function isRateLimited(key: string): boolean {
  const now = Date.now();
  const timestamps = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  timestamps.push(now);
  hits.set(key, timestamps);

  if (hits.size > MAX_TRACKED_KEYS) {
    for (const [k, v] of hits) {
      if (v.every((t) => now - t >= WINDOW_MS)) hits.delete(k);
    }
  }

  return timestamps.length > MAX_REQUESTS;
}

export function getClientKey(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() || "unknown";
}

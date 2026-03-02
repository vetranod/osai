export function normalizeJoinedMilestone<T>(raw: unknown): T | null {
  if (!raw) return null;
  if (Array.isArray(raw)) {
    return (raw[0] ?? null) as T | null;
  }
  return raw as T;
}

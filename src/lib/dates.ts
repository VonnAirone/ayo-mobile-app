/** Returns the number of whole days between a past ISO date string and now. */
export function daysSince(isoDateString: string): number {
  return Math.floor((Date.now() - new Date(isoDateString).getTime()) / 86_400_000);
}

/** Formats an ISO date string into a human-readable date (e.g. "Apr 6, 2025"). */
export function formatDate(isoDateString: string): string {
  return new Date(isoDateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

import type { MoodKey } from './mood';

export interface MoodEntry {
  id: string;
  mood: MoodKey;
  note: string | null;
  created_at: string;
}

export const REPORTED_MOODS = {
  struggling: { label: 'Low / Struggling', emoji: '😟' },
  okay: { label: 'Okay', emoji: '😐' },
  happy: { label: 'Good / Happy', emoji: '😊' },
};

export function summarizeMoods(entries: MoodEntry[]) {
  const ordered = [...entries].sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
  let changes = 0;
  let currentLowRun = 0;
  let longestLowRun = 0;
  for (let i = 0; i < ordered.length; i++) {
    if (i > 0 && ordered[i].mood !== ordered[i - 1].mood) changes++;
    currentLowRun = ordered[i].mood === 'struggling' ? currentLowRun + 1 : 0;
    longestLowRun = Math.max(longestLowRun, currentLowRun);
  }
  return {
    total: ordered.length,
    low: ordered.filter((entry) => entry.mood === 'struggling').length,
    changes,
    longestLowRun,
  };
}

export interface ScoredCheckIn {
  date: string;
  mood: MoodKey | null;
  score: number | null;
  maxScore: number | null;
}

/** Missing or invalid scores stay missing, rather than becoming a low result. */
export function checkInPercentage(checkIn: Pick<ScoredCheckIn, 'score' | 'maxScore'>): number | null {
  const { score, maxScore } = checkIn;
  if (score === null || maxScore === null || !Number.isFinite(score) ||
      !Number.isFinite(maxScore) || maxScore <= 0 || score < 0 || score > maxScore) return null;
  return Math.round((score / maxScore) * 100);
}

export function filterCheckIns<T extends { date: string }>(checkIns: T[], days: number, now = new Date()): T[] {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - days + 1);
  return checkIns.filter((entry) => {
    const time = new Date(entry.date).getTime();
    return Number.isFinite(time) && time <= now.getTime() && (days === 0 || time >= start.getTime());
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function summarizeCheckIns(checkIns: ScoredCheckIn[]) {
  const ordered = [...checkIns].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const points = ordered.map((entry) => ({ ...entry, percentage: checkInPercentage(entry) }));
  const scored = points.filter((entry) => entry.percentage !== null);
  const counts: Record<MoodKey, number> = { happy: 0, okay: 0, struggling: 0 };
  for (const entry of ordered) {
    if (entry.mood && Object.hasOwn(counts, entry.mood)) counts[entry.mood]++;
  }
  const moodCount = counts.happy + counts.okay + counts.struggling;
  const latest = points.at(-1) ?? null;
  const previous = points.at(-2) ?? null;
  return {
    points, counts, moodCount, latest,
    scoredCount: scored.length,
    average: scored.length ? Math.round(scored.reduce((sum, entry) => sum + entry.percentage!, 0) / scored.length) : null,
    // Only compare adjacent check-ins; do not skip an unscored result.
    change: latest?.percentage != null && previous?.percentage != null
      ? latest.percentage - previous.percentage : null,
  };
}

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

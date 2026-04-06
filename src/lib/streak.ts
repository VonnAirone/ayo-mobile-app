function toDateKey(date: Date): string {
  // Returns YYYY-MM-DD in local time
  return date.toLocaleDateString('en-CA');
}

export function calculateStreak(checkIns: { date: string }[]): number {
  if (checkIns.length === 0) return 0;

  // Deduplicate by calendar day (a student may submit more than once)
  const uniqueDays = [...new Set(checkIns.map((c) => toDateKey(new Date(c.date))))].sort().reverse();

  const today = toDateKey(new Date());
  const yesterday = toDateKey(new Date(Date.now() - 86_400_000));

  // Streak must include today or yesterday to be active
  if (uniqueDays[0] !== today && uniqueDays[0] !== yesterday) return 0;

  let streak = 1;
  for (let i = 1; i < uniqueDays.length; i++) {
    const prev = new Date(uniqueDays[i - 1]);
    const curr = new Date(uniqueDays[i]);
    const diffDays = Math.round((prev.getTime() - curr.getTime()) / 86_400_000);
    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

export function hasCheckedInToday(checkIns: { date: string }[]): boolean {
  const today = toDateKey(new Date());
  return checkIns.some((c) => toDateKey(new Date(c.date)) === today);
}

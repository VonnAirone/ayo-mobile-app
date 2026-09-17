import { moodFromKey, type MoodKey } from '../lib/mood';
import { summarizeMoods } from '../lib/moodHistory';
import { Card } from './ui/card';

interface DailyCheckIn {
  date: string;
  mood: MoodKey | null;
}

export function MoodTracking({ checkIns }: { checkIns: DailyCheckIn[] }) {
  const entries = checkIns.flatMap((checkIn, index) =>
    moodFromKey(checkIn.mood) ? [{
      id: String(index),
      mood: checkIn.mood as MoodKey,
      created_at: checkIn.date,
      note: null,
    }] : []
  );
  const summary = summarizeMoods(entries);

  if (summary.total === 0) return null;

  return (
    <Card className="p-5 border border-stone-200/70 rounded-2xl space-y-3">
      <div>
        <h3 className="text-lg font-semibold text-slate-800">Mood Tracking</h3>
        <p className="text-sm text-slate-500">Mood patterns from saved daily check-in results. View each check-in below for its date, mood, and responses.</p>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center text-sm">
        <div className="bg-stone-50 rounded-xl p-3"><strong>{summary.total}</strong><p>Check-ins with moods</p></div>
        <div className="bg-stone-50 rounded-xl p-3"><strong>{summary.low}</strong><p>Struggling results</p></div>
        <div className="bg-stone-50 rounded-xl p-3"><strong>{summary.changes}</strong><p>Mood changes</p></div>
      </div>
      <p className="text-xs text-slate-500">Changes count differences between consecutive recorded moods. Longest run of struggling results: {summary.longestLowRun} check-ins. Check-ins without a saved mood are excluded. Gaps do not show how someone felt. These results are not a diagnosis.</p>
    </Card>
  );
}

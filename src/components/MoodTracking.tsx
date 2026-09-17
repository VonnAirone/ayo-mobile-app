import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { moodFromKey, type MoodKey } from '../lib/mood';
import { summarizeCheckIns, type ScoredCheckIn } from '../lib/moodHistory';
import { Card } from './ui/card';

const moodStyles: Record<MoodKey, { label: string; color: string }> = {
  happy: { label: 'Happy / Doing well', color: 'bg-teal-500' },
  okay: { label: 'Okay', color: 'bg-amber-400' },
  struggling: { label: 'Struggling', color: 'bg-rose-400' },
};

export function MoodTracking({ checkIns, audience = 'student' }: { checkIns: ScoredCheckIn[]; audience?: 'student' | 'counselor' }) {
  const summary = summarizeCheckIns(checkIns);
  if (!checkIns.length) return null;
  const latestMood = moodFromKey(summary.latest?.mood);
  const chartPoints = summary.points.slice(-14).map((entry) => ({
    ...entry,
    label: new Date(entry.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
  }));
  const isStudent = audience === 'student';

  return (
    <Card className="overflow-hidden border border-stone-200/70 rounded-2xl gap-0">
      <div className="p-5 sm:p-6 bg-teal-50/70 space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">{isStudent ? 'Your well-being at a glance' : 'Well-being at a glance'}</h3>
          <p className="text-sm text-slate-500">Based on {checkIns.length} saved daily check-in{checkIns.length === 1 ? '' : 's'} in this view.</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium text-teal-800">Latest well-being score</p>
            <p className="text-4xl font-semibold text-teal-700 mt-1">{summary.latest?.percentage != null ? `${summary.latest.percentage}%` : '—'}</p>
            <p className="text-xs text-slate-500 mt-1">{summary.latest && new Date(summary.latest.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
          </div>
          <div className="self-center">
            <p className="text-sm font-medium text-slate-700">{latestMood ? `${latestMood.emoji} ${moodStyles[latestMood.key].label}` : 'No mood recorded'}</p>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              {summary.change === null ? 'A comparison needs two consecutive check-ins with scores.' : summary.change === 0
                ? 'The same score as the previous check-in.'
                : `${Math.abs(summary.change)} percentage points ${summary.change > 0 ? 'higher' : 'lower'} than the previous check-in.`}
            </p>
          </div>
        </div>
        {isStudent && latestMood && <p className="text-sm text-teal-900 leading-relaxed">{latestMood.key === 'happy'
          ? 'Take a moment to notice what helped on this check-in. Your reflections below can help you remember.'
          : latestMood.key === 'okay'
          ? 'There may be a mix of easier and harder moments. What would make today feel a little more manageable?'
          : 'This check-in suggests things felt difficult. You can share what has been on your mind with your guidance counselor.'}</p>}
      </div>

      <div className="p-5 sm:p-6 space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div><h4 className="text-sm font-semibold text-slate-700">Average well-being score</h4>
            <p className="text-xs text-slate-500 mt-1">Across {summary.scoredCount} scored check-in{summary.scoredCount === 1 ? '' : 's'} in this view.</p></div>
          <span className="text-2xl font-semibold text-teal-700">{summary.average !== null ? `${summary.average}%` : '—'}</span>
        </div>

        {summary.scoredCount > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-slate-700">Well-being over time</h4>
            <p className="text-xs text-slate-500 mt-1 mb-3">{summary.points.length > 14 ? 'Showing the latest 14 check-ins in this view.' : 'Each point represents one check-in.'} Higher scores reflect more positive questionnaire responses.</p>
            <div className="h-44 w-full" role="img" aria-label="Well-being score chart. Individual scores and dates are listed in the check-in history below.">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartPoints} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7e5e4" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} minTickGap={24} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} ticks={[0, 50, 100]} tick={{ fontSize: 11 }} unit="%" axisLine={false} tickLine={false} />
                  <Tooltip formatter={(value: number) => [`${value}%`, 'Well-being score']} labelFormatter={(_, items) => items[0]?.payload?.date ? new Date(items[0].payload.date).toLocaleString() : ''} />
                  <Line type="linear" dataKey="percentage" stroke="#0d9488" strokeWidth={2} dot={{ r: 4 }} connectNulls={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <div><h4 className="text-sm font-semibold text-slate-700">Mood breakdown</h4>
            <p className="text-xs text-slate-500 mt-1">Share of {summary.moodCount} check-ins with a recorded mood, not percentage of time spent feeling that way.</p></div>
          {summary.moodCount === 0 ? <p className="text-sm text-slate-500">These check-ins have no saved moods yet.</p> :
            (Object.keys(moodStyles) as MoodKey[]).map((key) => {
              const percentage = Math.round(summary.counts[key] / summary.moodCount * 100);
              return <div key={key}>
                <div className="flex justify-between gap-2 text-sm mb-1"><span className="text-slate-600">{moodFromKey(key)?.emoji} {moodStyles[key].label}</span><span className="text-slate-700 font-medium">{percentage}% <span className="text-xs font-normal text-slate-400">({summary.counts[key]})</span></span></div>
                <div className="h-2 rounded-full bg-stone-100 overflow-hidden" aria-hidden="true"><div className={`h-full rounded-full ${moodStyles[key].color}`} style={{ width: `${percentage}%` }} /></div>
              </div>;
            })}
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">The score is the percentage of available questionnaire points, not a measure of “how happy” someone is or a diagnosis. Missing scores are excluded from the average. Gaps and changes to questions can affect comparisons.</p>
      </div>
    </Card>
  );
}

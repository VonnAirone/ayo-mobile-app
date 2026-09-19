import { useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Activity } from 'lucide-react';
import { Card } from './ui/card';
import { moodFromKey } from '../lib/mood';
import { summarizeCheckIns, type ScoredCheckIn } from '../lib/moodHistory';

const levels = { struggling: 1, okay: 2, happy: 3 };
const names: Record<number, string> = { 1: 'Struggling', 2: 'Okay', 3: 'Happy' };

export function StudentMoodTrend({ checkIns }: { checkIns: ScoredCheckIn[] }) {
  const [view, setView] = useState<'mood' | 'score'>('mood');
  const summary = summarizeCheckIns(checkIns);
  const points = summary.points.map(entry => ({ ...entry, time: new Date(entry.date).getTime(), level: moodFromKey(entry.mood) ? levels[entry.mood!] : null }));
  const hasData = view === 'mood' ? summary.moodCount > 0 : summary.scoredCount > 0;
  const dateLabel = (value: number) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return <Card className="rounded-2xl border-stone-200/80 p-5 sm:p-6 gap-5 min-w-0">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h3 className="font-semibold text-slate-800 flex items-center gap-2"><Activity className="h-4 w-4 text-teal-600" />Mood trends</h3><p className="text-xs text-slate-500 mt-1">{checkIns.length} check-in{checkIns.length === 1 ? '' : 's'} in this period</p></div>
      <div className="flex rounded-xl bg-stone-100 p-1" aria-label="Trend display">{(['mood', 'score'] as const).map(value => <button key={value} aria-pressed={view === value} onClick={() => setView(value)} className={`rounded-lg px-3 py-1.5 text-xs font-medium ${view === value ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500'}`}>{value === 'mood' ? 'Mood' : 'Score'}</button>)}</div>
    </div>
    {hasData ? <div className="h-60 sm:h-72 min-w-0 w-full" role="img" aria-label={`${view === 'mood' ? 'Recorded mood' : 'Well-being score'} over time. Exact values are available in the chart data below.`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 15, bottom: 8, left: 0, right: 16 }}>
          <CartesianGrid stroke="#e7e5e4" strokeDasharray="3 3" vertical={false} />
          <XAxis type="number" dataKey="time" scale="time" domain={['dataMin', 'dataMax']} tickFormatter={dateLabel} tick={{ fontSize: 10 }} minTickGap={35} tickCount={4} axisLine={false} tickLine={false} />
          <YAxis width={view === 'mood' ? 72 : 45} domain={view === 'mood' ? [0.8, 3.2] : [0, 100]} ticks={view === 'mood' ? [1, 2, 3] : [0, 50, 100]} tickFormatter={value => view === 'mood' ? names[value] ?? '' : `${value}%`} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip labelFormatter={value => new Date(Number(value)).toLocaleString()} formatter={(value: number) => view === 'mood' ? [names[value], 'Recorded mood'] : [`${value}%`, 'Well-being score']} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
          <Line key={view} type="linear" dataKey={view === 'mood' ? 'level' : 'percentage'} name={view === 'mood' ? 'Recorded mood' : 'Well-being score'} stroke="#0d9488" strokeWidth={2} strokeDasharray={view === 'mood' ? '4 4' : undefined} dot={{ r: 4, fill: '#fff', strokeWidth: 2 }} activeDot={{ r: 6 }} connectNulls={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div> : <div className="rounded-xl bg-stone-50 px-5 py-10 text-center"><Activity className="h-7 w-7 text-teal-300 mx-auto mb-3" /><p className="text-sm text-slate-600">No {view === 'mood' ? 'recorded moods' : 'valid scores'} in this period.</p><p className="text-xs text-slate-400 mt-1">Try a wider date range.</p></div>}
    <div className="grid grid-cols-3 gap-2 border-t border-stone-100 pt-4">{([{key:'happy', label:'Happy', color:'bg-teal-500'}, {key:'okay', label:'Okay', color:'bg-amber-400'}, {key:'struggling', label:'Struggling', color:'bg-rose-400'}] as const).map(item => <div key={item.key}><p className="text-xs text-slate-500"><span className={`inline-block h-1.5 w-1.5 rounded-full mr-1 ${item.color}`} />{item.label}</p><p className="mt-1 font-semibold text-slate-700">{summary.counts[item.key]} <span className="font-normal text-xs text-slate-400">{summary.moodCount ? `· ${Math.round(summary.counts[item.key] / summary.moodCount * 100)}%` : ''}</span></p></div>)}</div>
    <p className="text-xs text-slate-500 leading-relaxed">Moods come from daily questionnaire results. Each point is one check-in; lines connect observations, not feelings between them. Missing results are left blank. Scores and mood categories are not diagnoses.</p>
    {!!points.length && <details><summary className="text-xs font-medium text-teal-700 cursor-pointer">View chart data</summary><div className="max-h-60 overflow-auto mt-3"><table className="w-full text-xs text-left"><caption className="sr-only">All check-ins in the selected period</caption><thead><tr>{['Date', 'Mood', 'Score'].map(label=><th key={label} scope="col" className="py-2 text-slate-500 font-medium">{label}</th>)}</tr></thead><tbody>{points.map((entry,index)=><tr key={`${entry.date}-${index}`} className="border-t border-stone-100"><td className="py-2 pr-2">{new Date(entry.date).toLocaleString()}</td><td className="py-2 pr-2">{entry.level ? names[entry.level] : 'Not recorded'}</td><td className="py-2">{entry.percentage === null ? '—' : `${entry.percentage}%`}</td></tr>)}</tbody></table></div></details>}
  </Card>;
}

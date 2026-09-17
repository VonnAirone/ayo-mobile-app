import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import type { MoodKey } from '../lib/mood';
import { REPORTED_MOODS, summarizeMoods, type MoodEntry } from '../lib/moodHistory';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { toast } from 'sonner';

export function MoodTracking({ studentId, allowEntry = false }: { studentId: string; allowEntry?: boolean }) {
  const { user, profile } = useAuth();
  const canSave = allowEntry && user?.id === studentId && profile?.role === 'student';
  const [mood, setMood] = useState<MoodKey | null>(null);
  const [note, setNote] = useState('');
  const [entries, setEntries] = useState<MoodEntry[]>([]);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [revision, setRevision] = useState(0);
  const [visible, setVisible] = useState(10);
  const saveLock = useRef(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    setEntries([]);
    setVisible(10);
    async function load() {
      try {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        start.setDate(start.getDate() - days + 1);
        // Fetch all pages so the summary never silently omits older entries.
        const rows: MoodEntry[] = [];
        for (let offset = 0; ; offset += 500) {
          const { data, error } = await supabase.from('mood_entries')
            .select('id, mood, note, created_at').eq('student_id', studentId)
            .gte('created_at', start.toISOString())
            .order('created_at', { ascending: false }).order('id', { ascending: false })
            .range(offset, offset + 499);
          if (cancelled) return;
          if (error) throw error;
          rows.push(...(data as MoodEntry[]));
          if (data.length < 500) break;
        }
        setEntries(rows);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [studentId, days, revision]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!canSave || !mood || saveLock.current) return;
    saveLock.current = true;
    setSaving(true);
    try {
      const { error } = await supabase.from('mood_entries').insert({
        student_id: studentId, mood, note: note.trim() || null,
      });
      if (error) throw error;
      setMood(null);
      setNote('');
      setRevision((value) => value + 1);
      toast.success('Mood check-in saved.');
    } catch {
      toast.error('Could not save your mood. Your entry is still here; please try again.');
    } finally {
      saveLock.current = false;
      setSaving(false);
    }
  }

  const summary = summarizeMoods(entries);
  return (
    <Card className="p-5 border border-stone-200/70 rounded-2xl space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-slate-800">Mood Tracking</h3>
        <p className="text-sm text-slate-500">Student-reported feelings over time. These entries are separate from questionnaire results.</p>
      </div>
      {canSave && (
        <form onSubmit={save} className="space-y-3">
          <fieldset disabled={saving}>
            <legend className="text-sm font-medium text-slate-700 mb-2">How are you feeling right now?</legend>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(REPORTED_MOODS) as MoodKey[]).map((key) => (
                <label key={key} className={`cursor-pointer rounded-xl border p-3 text-sm ${mood === key ? 'bg-teal-50 border-teal-600' : 'border-stone-200'}`}>
                  <input type="radio" name="reported-mood" value={key} checked={mood === key} onChange={() => setMood(key)} className="mr-2" required />
                  {REPORTED_MOODS[key].emoji} {REPORTED_MOODS[key].label}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="block text-sm text-slate-700">
            Add a note (optional)
            <textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={1000} disabled={saving}
              className="block w-full mt-1 border border-stone-200 rounded-xl p-3 min-h-24" placeholder="What has been on your mind?" />
          </label>
          <p className="text-xs text-slate-500">{note.length}/1000 · Your guidance counselors can view your moods and notes.</p>
          <Button type="submit" disabled={!mood || saving} className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl">{saving ? 'Saving…' : 'Save mood check-in'}</Button>
        </form>
      )}
      <label className="flex items-center gap-3 text-sm text-slate-700">
        Mood history
        <select value={days} onChange={(event) => setDays(Number(event.target.value))} className="border border-stone-200 rounded-lg p-2 bg-white">
          <option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option>
        </select>
      </label>
      {loading ? <p role="status" className="text-sm text-slate-500">Loading mood history…</p> : error ? (
        <div role="alert" className="text-sm text-slate-600">Could not load mood history. <button className="underline" onClick={() => setRevision((value) => value + 1)}>Try again</button></div>
      ) : entries.length === 0 ? <p className="text-sm text-slate-500">No mood entries in this period.</p> : (
        <>
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <div className="bg-stone-50 rounded-xl p-3"><strong>{summary.total}</strong><p>Entries</p></div>
            <div className="bg-stone-50 rounded-xl p-3"><strong>{summary.low}</strong><p>Low moods</p></div>
            <div className="bg-stone-50 rounded-xl p-3"><strong>{summary.changes}</strong><p>Mood changes</p></div>
          </div>
          <p className="text-xs text-slate-500">Changes count differences between consecutive entries. Longest run of low moods: {summary.longestLowRun} consecutive entries. Entries may be on the same day; gaps do not show how someone felt. These observations are not a diagnosis.</p>
          <ol className="space-y-3" aria-label="Mood timeline, newest first">
            {entries.slice(0, visible).map((entry) => (
              <li key={entry.id} className="border-l-2 border-teal-200 pl-3">
                <div className="text-sm font-medium text-slate-700">{REPORTED_MOODS[entry.mood].emoji} {REPORTED_MOODS[entry.mood].label}</div>
                <time dateTime={entry.created_at} className="text-xs text-slate-500">{new Date(entry.created_at).toLocaleString()}</time>
                {entry.note && <p className="text-sm text-slate-600 whitespace-pre-wrap break-words mt-1">{entry.note}</p>}
              </li>
            ))}
          </ol>
          {visible < entries.length && <Button variant="outline" onClick={() => setVisible((value) => value + 10)}>Show older entries</Button>}
        </>
      )}
    </Card>
  );
}

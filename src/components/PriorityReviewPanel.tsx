import { useEffect, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { PRIORITY_LABELS, reviewIsCurrent, type Priority, type PriorityReview } from '../lib/priority';
import type { CounselorOutletContext } from './CounselorDashboard';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { toast } from 'sonner';

export function PriorityReviewPanel({ studentId, latestCheckIn }: { studentId: string; latestCheckIn?: string }) {
  const { refreshStudents } = useOutletContext<CounselorOutletContext>();
  const [reviews, setReviews] = useState<PriorityReview[]>([]);
  const [priority, setPriority] = useState<Priority>('routine');
  const [rationale, setRationale] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [revision, setRevision] = useState(0);
  const lock = useRef(false);
  useEffect(() => {
    let cancelled = false; setLoading(true);
    (async () => {
      try {
        const { data, error } = await supabase.from('priority_reviews').select('*').eq('student_id', studentId).order('created_at', { ascending: false }).order('id', { ascending: false }).limit(10);
        if (error) throw error;
        if (!cancelled) { setReviews(data ?? []); setError(false); }
      } catch { if (!cancelled) setError(true); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [studentId, revision]);
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (lock.current || !rationale.trim()) return;
    lock.current = true; setSaving(true);
    try {
      const { error } = await supabase.from('priority_reviews').insert({ student_id: studentId, priority, rationale: rationale.trim() });
      if (error) throw error;
      setRationale(''); setRevision((value) => value + 1); refreshStudents(); toast.success('Counselor review saved.');
    } catch { toast.error('Could not save your review. Your draft is still here.'); }
    finally { lock.current = false; setSaving(false); }
  }
  const latest = reviews[0];
  return <Card className="p-5 space-y-4 border rounded-2xl">
    <div><h3 className="font-semibold text-slate-800">Counselor priority review</h3><p className="text-sm text-slate-500">Record your professional follow-up decision. Questionnaire scores are provisional indicators, not diagnoses or expert-approved thresholds.</p></div>
    {loading ? <p role="status">Loading reviews…</p> : error ? <p role="alert">Could not load reviews. <button className="underline" onClick={() => setRevision((value) => value + 1)}>Retry</button></p> : <p className="text-sm text-teal-800">{latest ? `Last decision: ${PRIORITY_LABELS[latest.priority]}. ${reviewIsCurrent(latest, latestCheckIn) ? 'Covers the latest check-in.' : 'A newer check-in needs review.'}` : 'No counselor review recorded yet.'}</p>}
    <form onSubmit={save} className="space-y-3"><label className="block text-sm">Follow-up priority<select aria-label="Follow-up priority" className="block w-full border rounded-xl p-2 mt-1" value={priority} onChange={(event) => setPriority(event.target.value as Priority)} disabled={saving}>{Object.entries(PRIORITY_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label className="block text-sm">Reason and planned follow-up<textarea className="block w-full border rounded-xl p-3 mt-1" rows={3} required maxLength={2000} value={rationale} disabled={saving} onChange={(event) => setRationale(event.target.value)} /></label><p className="text-xs text-slate-500">Counselor-only review. Previous decisions are preserved.</p><Button disabled={saving || loading || error || !rationale.trim()} type="submit">{saving ? 'Saving…' : 'Save review'}</Button></form>
    {!!reviews.length && <details><summary className="text-sm cursor-pointer text-teal-700">Recent review history (up to 10)</summary><div className="space-y-3 mt-3">{reviews.map((review) => <div key={review.id} className="border-l-2 border-teal-200 pl-3"><p className="text-sm font-medium">{PRIORITY_LABELS[review.priority]} · {new Date(review.created_at).toLocaleString()}</p><p className="text-xs text-slate-500">Reviewer ID: {review.reviewer_id}</p><p className="text-sm whitespace-pre-wrap break-words">{review.rationale}</p></div>)}</div></details>}
  </Card>;
}

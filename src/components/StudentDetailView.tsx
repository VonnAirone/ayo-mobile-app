import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Calendar, ChevronDown, Plus, ClipboardCheck, StickyNote, Clock, Heart } from 'lucide-react';
import { PriorityReviewPanel } from './PriorityReviewPanel';
import { StudentMoodTrend } from './StudentMoodTrend';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { getAnswerSeverity } from '../lib/severity';
import { moodFromKey } from '../lib/mood';
import { checkInPercentage, filterCheckIns, summarizeCheckIns } from '../lib/moodHistory';
import type { CounselorStudent } from './CounselorDashboard';

interface StudentDetailViewProps { student: CounselorStudent; onBack: () => void }
interface FollowUpNote { id: string; note: string; created_at: string }
const dateTime = (date: string) => new Date(date).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });

export function StudentDetailView({ student, onBack }: StudentDetailViewProps) {
  const [followUpNote, setFollowUpNote] = useState('');
  const [showFollowUpForm, setShowFollowUpForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [followUps, setFollowUps] = useState<FollowUpNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [notesError, setNotesError] = useState(false);
  const [revision, setRevision] = useState(0);
  const [days, setDays] = useState(30);
  const [tab, setTab] = useState('history');
  const saveLock = useRef(false);
  const panelsRef = useRef<HTMLDivElement>(null);
  const checkIns = filterCheckIns(student.checkIns, days);
  const summary = summarizeCheckIns(checkIns);
  const allCheckIns = filterCheckIns(student.checkIns, 0);
  const latest = allCheckIns[0];
  const latestMood = moodFromKey(latest?.mood);
  const latestScore = latest ? checkInPercentage(latest) : null;
  const isHigh = student.alertLevel === 'high';
  const isMedium = student.alertLevel === 'medium';

  useEffect(() => {
    let cancelled = false;
    setLoadingNotes(true); setNotesError(false);
    (async () => {
      try {
        const { data, error } = await supabase.from('follow_ups').select('id, note, created_at').eq('student_id', student.id).order('created_at', { ascending: false });
        if (error) throw error;
        if (!cancelled) setFollowUps(data ?? []);
      } catch { if (!cancelled) setNotesError(true); }
      finally { if (!cancelled) setLoadingNotes(false); }
    })();
    return () => { cancelled = true; };
  }, [student.id, revision]);

  function changeTab(value: string) { setTab(value); }
  function reviewPriority() {
    setTab('review');
    requestAnimationFrame(() => panelsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }
  function closeNote() { if (!saveLock.current) { setShowFollowUpForm(false); setFollowUpNote(''); } }
  async function saveNote(event: React.FormEvent) {
    event.preventDefault();
    if (!followUpNote.trim() || saveLock.current) return;
    saveLock.current = true; setSaving(true);
    try {
      const { error } = await supabase.from('follow_ups').insert({ student_id: student.id, note: followUpNote.trim() });
      if (error) throw error;
      setFollowUpNote(''); setShowFollowUpForm(false); setTab('notes'); setRevision(value => value + 1);
      toast.success('Follow-up note saved.');
    } catch { toast.error('Could not save your note. Your draft is still here.'); }
    finally { saveLock.current = false; setSaving(false); }
  }

  return <div className="p-5 lg:p-8 w-full min-w-0 max-w-6xl mx-auto space-y-6">
    <button onClick={onBack} className="flex items-center gap-2 text-sm text-slate-500 hover:text-teal-700"><ArrowLeft className="h-4 w-4" />All students</button>
    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
      <div className="flex items-center gap-3 min-w-0"><span aria-hidden="true" className="h-14 w-14 rounded-2xl shrink-0 bg-teal-100 text-teal-700 font-semibold text-lg flex items-center justify-center">{student.name.trim().split(/\s+/).slice(0,2).map(part => part[0]).join('').toUpperCase()}</span><div className="min-w-0"><p className="text-xs text-slate-400 mb-1">Student profile</p><h2 className="font-display text-3xl font-medium text-slate-800 break-words">{student.name}</h2></div></div>
      <div className="flex gap-2 shrink-0"><Button variant="outline" onClick={reviewPriority} className="rounded-xl border-stone-200 flex-1 sm:flex-none"><ClipboardCheck className="h-4 w-4" />Review priority</Button><Button onClick={() => setShowFollowUpForm(true)} className="rounded-xl bg-teal-700 hover:bg-teal-800 flex-1 sm:flex-none"><Plus className="h-4 w-4" />Add note</Button></div>
    </header>
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-stone-200/70 bg-white px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${isHigh ? 'bg-rose-50 text-rose-700' : isMedium ? 'bg-amber-50 text-amber-700' : 'bg-stone-100 text-slate-600'}`}>{isHigh ? 'High priority' : isMedium ? 'Follow-up needed' : 'No priority flag'}</span><p className="text-xs text-slate-500">{student.prioritySource} · For follow-up, not diagnosis</p></div>

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Card className="p-4 rounded-2xl border-stone-200/80 gap-2"><p className="text-xs text-slate-500 flex items-center gap-1.5"><Heart className="h-3.5 w-3.5 text-teal-600" />Latest mood</p><p className="font-semibold text-slate-800">{latestMood ? `${latestMood.emoji} ${latestMood.key === 'happy' ? 'Happy' : latestMood.key === 'okay' ? 'Okay' : 'Struggling'}` : 'Not recorded'}</p><p className="text-xs text-slate-400">Most recent check-in</p></Card>
      <Card className="p-4 rounded-2xl border-stone-200/80 gap-2"><p className="text-xs text-slate-500">Latest score</p><p className="text-2xl font-semibold text-teal-700">{latestScore === null ? '—' : `${latestScore}%`}</p><p className="text-xs text-slate-400">Questionnaire points</p></Card>
      <Card className="p-4 rounded-2xl border-stone-200/80 gap-2"><p className="text-xs text-slate-500">Total check-ins</p><p className="text-2xl font-semibold text-slate-800">{student.checkIns.length}</p><p className="text-xs text-slate-400">All time</p></Card>
      <Card className="p-4 rounded-2xl border-stone-200/80 gap-2"><p className="text-xs text-slate-500 flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />Last check-in</p><p className="font-semibold text-slate-800">{latest ? new Date(latest.date).toLocaleDateString(undefined, { month:'short', day:'numeric', year:'numeric' }) : 'No check-ins yet'}</p><p className="text-xs text-slate-400">Recorded activity</p></Card>
    </div>

    <section className="space-y-4 min-w-0" aria-label="Check-in trends">
      <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-sm font-semibold text-slate-700">Check-in overview</h3><div className="flex flex-wrap gap-1" aria-label="Check-in period">{[{days:7,label:'7 days'},{days:30,label:'30 days'},{days:90,label:'90 days'},{days:0,label:'All time'}].map(item => <button key={item.days} aria-pressed={days === item.days} onClick={() => { setDays(item.days); setExpandedIdx(null); }} className={`rounded-full px-3 py-2 text-xs border ${days === item.days ? 'bg-teal-700 border-teal-700 text-white' : 'bg-white border-stone-200 text-slate-500'}`}>{item.label}</button>)}</div></div>
      <StudentMoodTrend checkIns={checkIns} />
      <p className="text-xs text-slate-500">Period average: <strong className="text-slate-700">{summary.average === null ? '—' : `${summary.average}%`}</strong> across {summary.scoredCount} scored check-ins. The date filter applies to the graph and check-in history.</p>
    </section>

    <div ref={panelsRef} className="scroll-mt-20">
      <Tabs value={tab} onValueChange={changeTab} className="gap-5">
        <TabsList aria-label="Student records" className="w-full sm:w-fit h-11 bg-stone-100"><TabsTrigger value="history">Check-ins</TabsTrigger><TabsTrigger value="notes">Follow-up notes</TabsTrigger><TabsTrigger value="review">Priority review</TabsTrigger></TabsList>
        <TabsContent value="history" className="space-y-4">
          <div className="flex justify-between items-center"><h3 className="font-semibold text-slate-700">Check-in history</h3><span className="text-xs text-slate-400">{checkIns.length} in this period</span></div>
          {!!student.recentConcerns.length && <details className="rounded-xl border border-amber-100 bg-amber-50/50 p-4"><summary className="text-sm font-medium text-amber-800 cursor-pointer">Items to discuss from the latest check-in</summary><ul className="list-disc pl-5 mt-3 text-sm text-slate-600 space-y-2">{student.recentConcerns.map((item,index)=><li key={index}>{item}</li>)}</ul><p className="text-xs text-slate-500 mt-3">Based on the latest check-in, regardless of the selected period.</p></details>}
          {!checkIns.length ? <Card className="p-8 text-center rounded-2xl border-stone-200/80"><p className="text-sm text-slate-500">No check-ins in this period. Try a wider date range.</p></Card> : checkIns.map((checkIn,index) => {
            const mood = moodFromKey(checkIn.mood); const percentage = checkInPercentage(checkIn); const expanded = expandedIdx === index;
            const answers = checkIn.answers.filter(answer => answer.answer.trim());
            return <Card key={`${checkIn.date}-${index}`} className="rounded-2xl border-stone-200/80 overflow-hidden gap-0">
              <button onClick={()=>setExpandedIdx(expanded ? null : index)} aria-expanded={expanded} className="flex w-full items-center gap-3 p-4 sm:p-5 text-left hover:bg-stone-50"><span className="rounded-xl bg-teal-50 p-2.5 text-teal-600"><Calendar className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="text-sm font-medium text-slate-700">{dateTime(checkIn.date)}</p><p className="text-xs text-slate-500 mt-1">{mood ? `${mood.emoji} ${mood.label}` : 'No mood recorded'}</p></div><div className="flex items-center gap-2 shrink-0"><span className="text-sm font-semibold text-teal-700">{percentage === null ? '—' : `${percentage}%`}</span><ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} /></div></button>
              {expanded && <div className="border-t border-stone-100 p-5 space-y-4">{!answers.length ? <p className="text-sm text-slate-500">No responses recorded.</p> : answers.map((answer,index)=><div key={`${answer.questionId}-${index}`} className={`border-l-2 pl-3 ${getAnswerSeverity(answer) === 'none' ? 'border-stone-200' : 'border-amber-300'}`}><p className="text-xs text-slate-500">{answer.question}</p><p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap break-words">{answer.answer}</p></div>)}</div>}
            </Card>;
          })}
        </TabsContent>
        <TabsContent value="notes" className="space-y-4"><div className="flex items-center justify-between"><h3 className="font-semibold text-slate-700">Follow-up notes</h3><span className="text-xs text-slate-400">All time · {followUps.length} notes</span></div>
          {loadingNotes ? <p role="status" className="text-sm text-slate-500">Loading notes…</p> : notesError ? <p role="alert" className="text-sm text-rose-700">Could not load notes. <button onClick={()=>setRevision(value=>value+1)} className="underline">Retry</button></p> : !followUps.length ? <Card className="p-8 items-center text-center rounded-2xl border-stone-200/80 gap-3"><StickyNote className="h-7 w-7 text-teal-300" /><p className="text-sm text-slate-500">No follow-up notes yet.</p><Button variant="outline" onClick={()=>setShowFollowUpForm(true)}>Add first note</Button></Card> : followUps.map(note=><Card key={note.id} className="p-5 rounded-2xl border-stone-200/80 gap-2"><time className="text-xs text-slate-400">{dateTime(note.created_at)}</time><p className="text-sm text-slate-700 whitespace-pre-wrap break-words leading-relaxed">{note.note}</p></Card>)}
        </TabsContent>
        <TabsContent value="review" forceMount className={tab !== 'review' ? 'hidden' : ''}><PriorityReviewPanel key={student.id} studentId={student.id} latestCheckIn={student.lastCheckIn} /></TabsContent>
      </Tabs>
    </div>
    <Dialog open={showFollowUpForm} onOpenChange={open => { if (open) setShowFollowUpForm(true); else closeNote(); }}>
      <DialogContent className="rounded-2xl"><DialogHeader><DialogTitle>New follow-up note</DialogTitle><DialogDescription>Record the conversation, next steps, or referrals. This note is visible to the student.</DialogDescription></DialogHeader><form onSubmit={saveNote} className="space-y-4"><label className="block text-sm text-slate-600">Note<Textarea aria-label="Follow-up note" required rows={5} value={followUpNote} disabled={saving} onChange={event=>setFollowUpNote(event.target.value)} placeholder="What was discussed, and what happens next?" className="mt-2 rounded-xl resize-y max-h-64" /></label><div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={saving} onClick={closeNote}>Cancel</Button><Button type="submit" disabled={saving || !followUpNote.trim()} className="bg-teal-700 hover:bg-teal-800">{saving ? 'Saving…' : 'Save note'}</Button></div></form></DialogContent>
    </Dialog>
  </div>;
}

import { PriorityReviewPanel } from './PriorityReviewPanel';
import { MoodTracking } from './MoodTracking';
import { useEffect, useState } from 'react';
import { ArrowLeft, Calendar, ChevronDown, ChevronUp, FileText, AlertTriangle, AlertCircle, Heart, Clock, StickyNote } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { getAnswerSeverity } from '../lib/severity';
import { moodFromKey } from '../lib/mood';
import type { CounselorStudent } from './CounselorDashboard';

interface StudentDetailViewProps {
  student: CounselorStudent;
  onBack: () => void;
}

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
}

function formatDate(dateString: string): string {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function daysSinceDate(dateString: string): number {
  return Math.floor((Date.now() - new Date(dateString).getTime()) / (1000 * 60 * 60 * 24));
}

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

interface FollowUpNote {
  id: string;
  note: string;
  created_at: string;
}

export function StudentDetailView({ student, onBack }: StudentDetailViewProps) {
  const [followUpNote, setFollowUpNote] = useState('');
  const [showFollowUpForm, setShowFollowUpForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(0);
  const [followUps, setFollowUps] = useState<FollowUpNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(true);

  const isHigh = student.alertLevel === 'high';
  const isMedium = student.alertLevel === 'medium';
  const daysSinceLast = student.lastCheckIn ? daysSinceDate(student.lastCheckIn) : null;

  const latestCheckIn = student.checkIns[0];
  const concernCount = (latestCheckIn?.answers ?? []).filter(
    (a) => getAnswerSeverity(a) === 'medium'
  ).length;

  async function loadFollowUps() {
    const { data, error } = await supabase
      .from('follow_ups')
      .select('id, note, created_at')
      .eq('student_id', student.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to load follow-ups:', error.message);
    } else {
      setFollowUps(data ?? []);
    }
    setLoadingNotes(false);
  }

  useEffect(() => {
    setLoadingNotes(true);
    loadFollowUps();
  }, [student.id]);

  function closeFollowUpForm() {
    setShowFollowUpForm(false);
    setFollowUpNote('');
  }

  useEffect(() => {
    if (!showFollowUpForm) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeFollowUpForm();
    }
    window.addEventListener('keydown', onKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [showFollowUpForm]);

  async function handleSaveFollowUp() {
    if (!followUpNote.trim()) return;
    setSaving(true);

    const { error } = await supabase.from('follow_ups').insert({
      student_id: student.id,
      note: followUpNote.trim(),
    });

    if (error) {
      toast.error('Failed to save follow-up note.');
    } else {
      toast.success('Follow-up note saved.');
      setFollowUpNote('');
      setShowFollowUpForm(false);
      await loadFollowUps();
    }
    setSaving(false);
  }

  return (
    <div className="p-6 lg:p-8 max-w-3xl space-y-6">
      {/* Header */}
      <div className="pt-2 flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 hover:bg-stone-100 rounded-xl transition-colors text-slate-400 hover:text-slate-600 lg:hidden"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Avatar + name */}
        <div className="flex items-center gap-3 flex-1">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center text-base font-semibold flex-shrink-0 ${
              isHigh
                ? 'bg-rose-100 text-rose-600'
                : isMedium
                ? 'bg-pink-100 text-pink-600'
                : 'bg-teal-100 text-teal-600'
            }`}
          >
            {getInitials(student.name)}
          </div>
          <div>
            <h2 className="font-display text-2xl font-medium text-slate-800 tracking-tight">{student.name}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-slate-400">Student</span>
              {student.alertLevel !== 'none' && (
                <>
                  <span className="text-stone-300">·</span>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      isHigh ? 'bg-rose-100 text-rose-600' : 'bg-pink-100 text-pink-600'
                    }`}
                  >
                    {isHigh ? 'High Priority' : 'Needs Comfort'}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-500">{student.prioritySource}. Priority guides follow-up and is not a diagnosis.</p>
      <PriorityReviewPanel key={student.id} studentId={student.id} latestCheckIn={student.lastCheckIn} />

      {/* Alert banner */}
      {student.alertLevel !== 'none' && (
        <Card
          className={`p-4 border rounded-2xl ${
            isHigh ? 'bg-rose-50 border-rose-100' : 'bg-pink-50 border-pink-100'
          }`}
        >
          <div className="flex items-start gap-3">
            {isHigh ? (
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-400" />
            ) : (
              <Heart className="w-5 h-5 flex-shrink-0 mt-0.5 text-pink-400" />
            )}
            <div>
              <p className={`text-sm font-semibold ${isHigh ? 'text-rose-700' : 'text-pink-700'}`}>
                {isHigh ? 'High-priority follow-up indicator' : 'Follow-up indicator'}
              </p>
              <p className={`text-xs mt-0.5 leading-relaxed ${isHigh ? 'text-rose-600' : 'text-pink-600'}`}>
                {isHigh
                  ? 'Review the responses and counselor decision above to plan appropriate follow-up.'
                  : 'This student may benefit from a comforting conversation. Reach out when possible.'}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 border border-stone-200/70 rounded-2xl text-center flex flex-col justify-end">
          <div className="text-2xl font-semibold text-teal-600 leading-none">{student.checkIns.length}</div>
          <div className="text-xs text-slate-400 mt-1">Check-Ins</div>
        </Card>
        <Card className="p-4 border border-stone-200/70 rounded-2xl text-center flex flex-col justify-end">
          <div className="flex items-center justify-center gap-1 leading-none">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-sm font-semibold text-slate-700">
              {daysSinceLast === null
                ? '—'
                : daysSinceLast === 0
                ? 'Today'
                : daysSinceLast === 1
                ? '1d ago'
                : `${daysSinceLast}d ago`}
            </span>
          </div>
          <div className="text-xs text-slate-400 mt-1">Last Seen</div>
        </Card>
        <Card className="p-4 border border-stone-200/70 rounded-2xl text-center flex flex-col justify-end">
          <div className={`text-2xl font-semibold leading-none ${concernCount > 0 ? 'text-amber-500' : 'text-slate-300'}`}>
            {concernCount}
          </div>
          <div className="text-xs text-slate-400 mt-1">Concerns</div>
        </Card>
      </div>

      <MoodTracking checkIns={student.checkIns} audience="counselor" />

      {/* Recent concerns */}
      {student.recentConcerns.length > 0 && (
        <Card className="p-5 border border-stone-200/70 rounded-2xl">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Recent Concerns</h3>
          <div className="flex flex-wrap gap-2">
            {student.recentConcerns.map((concern, idx) => (
              <span
                key={idx}
                className="text-xs bg-stone-50 border border-stone-200/70 text-slate-600 px-3 py-1 rounded-full"
              >
                {concern}
              </span>
            ))}
          </div>
        </Card>
      )}

      {/* Follow-up notes */}
      <div>
        <div className="flex items-center justify-between mb-3 gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="text-sm font-semibold text-slate-700">Follow-Up Notes</h3>
            {followUps.length > 0 && (
              <span className="text-xs text-slate-400">{followUps.length} note{followUps.length !== 1 ? 's' : ''}</span>
            )}
          </div>
          <Button
            size="sm"
            onClick={() => setShowFollowUpForm(true)}
            className="rounded-xl text-xs h-8 px-3 bg-teal-600 hover:bg-teal-700 text-white flex-shrink-0"
          >
            + Add Note
          </Button>
        </div>

        {loadingNotes ? (
          <Card className="p-6 text-center border border-stone-200/70 rounded-2xl">
            <p className="text-slate-400 text-sm">Loading notes…</p>
          </Card>
        ) : followUps.length === 0 ? (
          <Card className="p-6 text-center border border-stone-200/70 rounded-2xl">
            <StickyNote className="w-5 h-5 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">No follow-up notes yet.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {followUps.map((note) => (
              <Card key={note.id} className="p-4 border border-stone-200/70 rounded-2xl">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-teal-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <StickyNote className="w-4 h-4 text-teal-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-400 mb-1.5">{formatDateTime(note.created_at)}</p>
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap break-words">
                      {note.note}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Check-in history */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Check-In History</h3>

        {student.checkIns.length === 0 ? (
          <Card className="p-10 text-center border border-stone-200/70 rounded-2xl">
            <div className="text-2xl mb-2">🌱</div>
            <p className="text-slate-400 text-sm">No check-ins submitted yet.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {student.checkIns.map((checkIn, idx) => {
              const isExpanded = expandedIdx === idx;
              const mood = moodFromKey(checkIn.mood);
              const percentage =
                checkIn.score !== null && checkIn.maxScore && checkIn.maxScore > 0
                  ? Math.round((checkIn.score / checkIn.maxScore) * 100)
                  : null;
              const filledAnswers = checkIn.answers.filter((a) => a.answer.trim().length > 0);

              return (
                <Card key={idx} className="border border-stone-200/70 rounded-2xl overflow-hidden">
                  {/* Session header — always visible, click to expand */}
                  <button
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-stone-50 transition-colors"
                    onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-teal-50 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Calendar className="w-4 h-4 text-teal-500" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-medium text-slate-700">{formatDate(checkIn.date)}</p>
                        <p className="text-xs text-slate-400">
                          {filledAnswers.length} response{filledAnswers.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {mood && (
                        <span className="text-xs text-slate-500 bg-stone-100 px-2.5 py-1 rounded-full hidden sm:block">
                          {mood.emoji} {mood.label}
                          {percentage !== null && ` · ${percentage}%`}
                        </span>
                      )}
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </button>

                  {/* Expanded answers */}
                  {isExpanded && filledAnswers.length > 0 && (
                    <div className="px-5 pb-5 space-y-3 border-t border-stone-100 pt-4">
                      {filledAnswers.map((a) => {
                        const severity = getAnswerSeverity(a);
                        const borderClass =
                          severity === 'high'
                            ? 'border-rose-300'
                            : severity === 'medium'
                            ? 'border-amber-300'
                            : 'border-stone-200/70';
                        return (
                          <div key={a.questionId} className={`text-sm border-l-2 ${borderClass} pl-3`}>
                            <div className="flex items-start gap-2 mb-0.5">
                              <p className="text-slate-400 text-xs flex-1">{a.question}</p>
                              {severity === 'high' && (
                                <span className="text-[10px] font-medium text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-full flex-shrink-0">
                                  High concern
                                </span>
                              )}
                              {severity === 'medium' && (
                                <span className="text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full flex-shrink-0">
                                  Medium
                                </span>
                              )}
                            </div>
                            <p className="text-slate-700">{a.answer}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Follow-up note modal — slides up from bottom */}
      {showFollowUpForm && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          role="dialog"
          aria-modal="true"
          aria-label="Add follow-up note"
        >
          <button
            type="button"
            aria-label="Close"
            onClick={closeFollowUpForm}
            className="absolute inset-0 bg-black/40 animate-overlay-in"
          />
          <div className="relative w-full sm:max-w-lg h-[50vh] sm:h-auto bg-white rounded-t-3xl sm:rounded-3xl sm:mb-6 shadow-xl animate-slide-up flex flex-col pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <span className="w-10 h-1.5 rounded-full bg-stone-200" aria-hidden="true" />
            </div>
            <div className="px-5 pt-2 flex-1 flex flex-col min-h-0">
              <div className="flex items-center gap-2 mb-3 flex-shrink-0">
                <FileText className="w-4 h-4 text-teal-600" />
                <h4 className="text-sm font-semibold text-slate-700">Follow-Up Note</h4>
              </div>
              <Textarea
                placeholder="Enter follow-up notes, action items, or referrals…"
                value={followUpNote}
                onChange={(e) => setFollowUpNote(e.target.value)}
                autoFocus
                className="mb-3 bg-white border-stone-200/70 focus:border-teal-300 rounded-xl text-sm resize-none flex-1 min-h-0"
              />
              <div className="flex gap-2 flex-shrink-0">
                <Button
                  onClick={handleSaveFollowUp}
                  disabled={saving || !followUpNote.trim()}
                  className="flex-1 bg-teal-600 hover:bg-teal-700 rounded-xl text-sm h-10"
                >
                  {saving ? 'Saving…' : 'Save Note'}
                </Button>
                <Button
                  onClick={closeFollowUpForm}
                  variant="outline"
                  className="rounded-xl text-sm h-10 border-stone-200/70"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

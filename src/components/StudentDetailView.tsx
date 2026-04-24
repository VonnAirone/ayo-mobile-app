import { useState } from 'react';
import { ArrowLeft, Calendar, ChevronDown, ChevronUp, FileText, AlertTriangle, Clock } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
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

export function StudentDetailView({ student, onBack }: StudentDetailViewProps) {
  const [followUpNote, setFollowUpNote] = useState('');
  const [showFollowUpForm, setShowFollowUpForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(0);

  const isHigh = student.alertLevel === 'high';
  const isMedium = student.alertLevel === 'medium';
  const daysSinceLast = student.lastCheckIn ? daysSinceDate(student.lastCheckIn) : null;

  const crisisFlags = student.checkIns[0]?.answers.filter(
    (a) =>
      a.answer === 'Yes' &&
      [
        'home_abuse', 'edu_bullying', 'safety_suicidal_thoughts', 'repro_forced',
        'mh_wished_dead', 'mh_family_better_off', 'mh_thoughts_killing',
        'mh_tried_kill', 'mh_current_thoughts',
      ].includes(a.questionId)
  ).length ?? 0;

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
                ? 'bg-amber-100 text-amber-600'
                : 'bg-teal-100 text-teal-600'
            }`}
          >
            {getInitials(student.name)}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-800">{student.name}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-slate-400">Student</span>
              {student.alertLevel !== 'none' && (
                <>
                  <span className="text-stone-300">·</span>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      isHigh ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'
                    }`}
                  >
                    {isHigh ? 'High Priority' : 'Medium Priority'}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Follow-up button */}
        <Button
          size="sm"
          onClick={() => setShowFollowUpForm(!showFollowUpForm)}
          className={`rounded-xl text-xs h-8 px-3 ${
            showFollowUpForm
              ? 'bg-stone-100 text-slate-600 hover:bg-stone-200'
              : 'bg-teal-600 hover:bg-teal-700 text-white'
          }`}
        >
          {showFollowUpForm ? 'Cancel' : '+ Follow-Up Note'}
        </Button>
      </div>

      {/* Alert banner */}
      {student.alertLevel !== 'none' && (
        <Card
          className={`p-4 border rounded-2xl ${
            isHigh ? 'bg-rose-50 border-rose-100' : 'bg-amber-50 border-amber-100'
          }`}
        >
          <div className="flex items-start gap-3">
            <AlertTriangle
              className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                isHigh ? 'text-rose-400' : 'text-amber-400'
              }`}
            />
            <div>
              <p className={`text-sm font-semibold ${isHigh ? 'text-rose-700' : 'text-amber-700'}`}>
                {isHigh ? 'Immediate follow-up recommended' : 'Check-in recommended'}
              </p>
              <p className={`text-xs mt-0.5 leading-relaxed ${isHigh ? 'text-rose-600' : 'text-amber-600'}`}>
                {isHigh
                  ? 'This student may be experiencing significant distress. Please reach out soon.'
                  : 'This student may benefit from a counselor session. Schedule when possible.'}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Follow-up form */}
      {showFollowUpForm && (
        <Card className="p-5 border border-teal-100 bg-teal-50/50 rounded-2xl">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-teal-600" />
            <h4 className="text-sm font-semibold text-slate-700">Follow-Up Note</h4>
          </div>
          <Textarea
            placeholder="Enter follow-up notes, action items, or referrals…"
            value={followUpNote}
            onChange={(e) => setFollowUpNote(e.target.value)}
            rows={4}
            className="mb-3 bg-white border-stone-200 focus:border-teal-300 rounded-xl text-sm resize-none"
          />
          <div className="flex gap-2">
            <Button
              onClick={handleSaveFollowUp}
              disabled={saving || !followUpNote.trim()}
              className="flex-1 bg-teal-600 hover:bg-teal-700 rounded-xl text-sm h-9"
            >
              {saving ? 'Saving…' : 'Save Note'}
            </Button>
            <Button
              onClick={() => { setShowFollowUpForm(false); setFollowUpNote(''); }}
              variant="outline"
              className="rounded-xl text-sm h-9 border-stone-200"
            >
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 border border-stone-100 rounded-2xl shadow-sm text-center">
          <div className="text-2xl font-semibold text-teal-600">{student.checkIns.length}</div>
          <div className="text-xs text-slate-400 mt-1">Check-Ins</div>
        </Card>
        <Card className="p-4 border border-stone-100 rounded-2xl shadow-sm text-center">
          <div className="flex items-center justify-center gap-1">
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
        <Card className="p-4 border border-stone-100 rounded-2xl shadow-sm text-center">
          <div className={`text-2xl font-semibold ${crisisFlags > 0 ? 'text-rose-500' : 'text-slate-300'}`}>
            {crisisFlags}
          </div>
          <div className="text-xs text-slate-400 mt-1">Crisis Flags</div>
        </Card>
      </div>

      {/* Recent concerns */}
      {student.recentConcerns.length > 0 && (
        <Card className="p-5 border border-stone-100 rounded-2xl shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Recent Concerns</h3>
          <div className="flex flex-wrap gap-2">
            {student.recentConcerns.map((concern, idx) => (
              <span
                key={idx}
                className="text-xs bg-stone-50 border border-stone-200 text-slate-600 px-3 py-1 rounded-full"
              >
                {concern}
              </span>
            ))}
          </div>
        </Card>
      )}

      {/* Check-in history */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Check-In History</h3>

        {student.checkIns.length === 0 ? (
          <Card className="p-10 text-center border border-stone-100 rounded-2xl shadow-sm">
            <div className="text-2xl mb-2">🌱</div>
            <p className="text-slate-400 text-sm">No check-ins submitted yet.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {student.checkIns.map((checkIn, idx) => {
              const isExpanded = expandedIdx === idx;
              const moodAnswer = checkIn.answers.find((a) => a.questionId === 'mood');
              const filledAnswers = checkIn.answers.filter((a) => a.answer.trim().length > 0);

              return (
                <Card key={idx} className="border border-stone-100 rounded-2xl shadow-sm overflow-hidden">
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
                      {moodAnswer && (
                        <span className="text-xs text-slate-500 bg-stone-100 px-2.5 py-1 rounded-full hidden sm:block">
                          {moodAnswer.answer}
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
                      {filledAnswers.map((a) => (
                        <div key={a.questionId} className="text-sm border-l-2 border-teal-100 pl-3">
                          <p className="text-slate-400 text-xs mb-0.5">{a.question}</p>
                          <p className="text-slate-700">{a.answer}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

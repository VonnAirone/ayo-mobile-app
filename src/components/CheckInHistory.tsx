import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { ChevronDown, Calendar, AlertCircle } from 'lucide-react';
import { Card } from './ui/card';
import { formatDate } from '../lib/dates';
import type { StudentOutletContext } from './StudentDashboard';

function isToday(dateString: string) {
  const d = new Date(dateString);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
}

function isYesterday(dateString: string) {
  const d = new Date(dateString);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate();
}

function getRelativeLabel(dateString: string) {
  if (isToday(dateString)) return 'Today';
  if (isYesterday(dateString)) return 'Yesterday';
  return null;
}

export function CheckInHistory() {
  const { checkIns } = useOutletContext<StudentOutletContext>();
  // First entry open by default
  const [openIds, setOpenIds] = useState<Set<string>>(() => {
    const s = new Set<string>();
    if (checkIns[0]) s.add(checkIns[0].id);
    return s;
  });

  function toggle(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="p-6 lg:p-8 max-w-2xl space-y-5">
      <div className="pt-2">
        <h2 className="text-2xl font-semibold text-slate-800">Check-In History</h2>
        <p className="text-slate-400 text-sm mt-0.5">Your past well-being check-ins</p>
      </div>

      {checkIns.length === 0 ? (
        <Card className="p-14 text-center border border-stone-100 rounded-2xl shadow-sm">
          <div className="text-3xl mb-3">🌱</div>
          <p className="text-slate-400 text-sm">No check-ins yet. Start your first one today!</p>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {checkIns.map((checkIn) => {
            const isOpen = openIds.has(checkIn.id);
            const filledAnswers = checkIn.answers.filter((a) => a.answer.trim().length > 0);
            const yesCount = filledAnswers.filter((a) => a.answer === 'Yes').length;
            const noCount = filledAnswers.filter((a) => a.answer === 'No').length;
            const hasConcern = yesCount > 0;
            const relativeLabel = getRelativeLabel(checkIn.date);

            return (
              <Card
                key={checkIn.id}
                className="border border-stone-100 rounded-2xl shadow-sm overflow-hidden"
              >
                {/* Clickable header */}
                <button
                  onClick={() => toggle(checkIn.id)}
                  className="w-full flex items-center gap-3 px-5 py-4 hover:bg-stone-50 transition-colors text-left"
                  aria-expanded={isOpen}
                >
                  {/* Date icon */}
                  <div className="w-9 h-9 bg-teal-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-4 h-4 text-teal-500" />
                  </div>

                  {/* Date + meta */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-slate-700">
                        {formatDate(checkIn.date)}
                      </span>
                      {relativeLabel && (
                        <span className="text-xs bg-teal-50 text-teal-600 px-2 py-0.5 rounded-full font-medium">
                          {relativeLabel}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-400">
                        {filledAnswers.length} response{filledAnswers.length !== 1 ? 's' : ''}
                      </span>
                      {yesCount > 0 && (
                        <>
                          <span className="text-stone-300 text-xs">·</span>
                          <span className="text-xs text-slate-400">
                            {yesCount} yes · {noCount} no
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Right side: concern indicator + chevron */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {hasConcern && (
                      <span className="hidden sm:flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                        <AlertCircle className="w-3 h-3" />
                        {yesCount} concern{yesCount !== 1 ? 's' : ''}
                      </span>
                    )}
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    />
                  </div>
                </button>

                {/* Collapsible answers */}
                {isOpen && (
                  <div className="border-t border-stone-100 px-5 py-4 space-y-3">
                    {filledAnswers.length === 0 ? (
                      <p className="text-slate-400 text-sm text-center py-2">No responses recorded.</p>
                    ) : (
                      filledAnswers.map((a) => {
                        const isYes = a.answer === 'Yes';
                        const isNo = a.answer === 'No';
                        return (
                          <div
                            key={a.questionId}
                            className={`flex items-start justify-between gap-4 text-sm pb-3 border-b border-stone-50 last:border-0 last:pb-0`}
                          >
                            <p className="text-slate-500 text-xs leading-snug flex-1">{a.question}</p>
                            <span
                              className={`text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${
                                isYes
                                  ? 'bg-rose-50 text-rose-600'
                                  : isNo
                                  ? 'bg-stone-100 text-slate-500'
                                  : 'bg-teal-50 text-teal-700'
                              }`}
                            >
                              {a.answer}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

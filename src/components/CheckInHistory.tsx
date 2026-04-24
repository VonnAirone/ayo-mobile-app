import { useOutletContext } from 'react-router-dom';
import { Card } from './ui/card';
import { formatDate } from '../lib/dates';
import type { StudentOutletContext } from './StudentDashboard';

export function CheckInHistory() {
  const { checkIns } = useOutletContext<StudentOutletContext>();

  const getMoodStyle = (answer: string) => {
    if (answer.includes('Really struggling')) return 'bg-rose-100 text-rose-600';
    if (answer.includes('Low')) return 'bg-amber-100 text-amber-600';
    if (answer.includes('Okay')) return 'bg-yellow-100 text-yellow-600';
    if (answer.includes('Good')) return 'bg-emerald-100 text-emerald-600';
    if (answer.includes('Great')) return 'bg-teal-100 text-teal-600';
    return 'bg-stone-100 text-slate-500';
  };

  return (
    <div className="p-6 lg:p-8 max-w-4xl space-y-6">
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
        <div className="space-y-4">
          {checkIns.map((checkIn) => {
            const moodAnswer = checkIn.answers.find((a) => a.questionId === 'mood');
            return (
              <Card key={checkIn.id} className="p-5 border border-stone-100 rounded-2xl shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs text-slate-400 font-medium">{formatDate(checkIn.date)}</span>
                  {moodAnswer && (
                    <span className={`text-xs font-medium px-3 py-1 rounded-full ${getMoodStyle(moodAnswer.answer)}`}>
                      {moodAnswer.answer}
                    </span>
                  )}
                </div>

                <div className="space-y-3">
                  {checkIn.answers
                    .filter((a) => a.answer.trim().length > 0)
                    .map((a) => (
                      <div key={a.questionId} className="text-sm">
                        <p className="text-slate-400 text-xs mb-0.5">{a.question}</p>
                        <p className="text-slate-700">{a.answer}</p>
                      </div>
                    ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

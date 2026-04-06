import { useOutletContext } from 'react-router-dom';
import { Card } from './ui/card';
import type { StudentOutletContext } from './StudentDashboard';

export function CheckInHistory() {
  const { checkIns } = useOutletContext<StudentOutletContext>();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getMoodStyle = (answer: string) => {
    if (answer.includes('Really struggling')) return 'bg-red-100 text-red-800';
    if (answer.includes('Low')) return 'bg-orange-100 text-orange-800';
    if (answer.includes('Okay')) return 'bg-yellow-100 text-yellow-800';
    if (answer.includes('Good')) return 'bg-green-100 text-green-800';
    if (answer.includes('Great')) return 'bg-blue-100 text-blue-800';
    return 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="p-6 lg:p-8 max-w-4xl space-y-6">
      <div className="pt-2">
        <h2 className="text-2xl mb-1">Check-In History</h2>
        <p className="text-gray-600">Your past well-being check-ins</p>
      </div>

      {checkIns.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-gray-500">No check-ins yet. Start your first one today!</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {checkIns.map((checkIn) => {
            const moodAnswer = checkIn.answers.find((a) => a.questionId === 'mood');
            return (
              <Card key={checkIn.id} className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-gray-500">{formatDate(checkIn.date)}</span>
                  {moodAnswer && (
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${getMoodStyle(moodAnswer.answer)}`}>
                      {moodAnswer.answer}
                    </span>
                  )}
                </div>

                <div className="space-y-3">
                  {checkIn.answers
                    .filter((a) => a.answer.trim().length > 0)
                    .map((a) => (
                      <div key={a.questionId} className="text-sm">
                        <p className="text-gray-500 mb-0.5">{a.question}</p>
                        <p className="text-gray-800">{a.answer}</p>
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

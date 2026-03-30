import { useOutletContext } from 'react-router-dom';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
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

  const getMoodLabel = (mood: number) => {
    if (mood <= 3) return { label: 'Low', color: 'bg-red-100 text-red-800' };
    if (mood <= 5) return { label: 'Fair', color: 'bg-yellow-100 text-yellow-800' };
    if (mood <= 7) return { label: 'Good', color: 'bg-green-100 text-green-800' };
    return { label: 'Great', color: 'bg-blue-100 text-blue-800' };
  };

  return (
    <div className="p-6 lg:p-8 max-w-4xl space-y-6">
      <div className="pt-2">
        <h2 className="text-2xl mb-1">Check-In History</h2>
        <p className="text-gray-600">View your past well-being check-ins</p>
      </div>

      {checkIns.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-gray-500">No check-ins yet. Start your first one today!</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {checkIns.map((checkIn) => {
            const moodInfo = getMoodLabel(checkIn.mood);
            return (
              <Card key={checkIn.id} className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="text-sm text-gray-500 mb-1">
                      {formatDate(checkIn.date)}
                    </div>
                    <Badge className={moodInfo.color}>{moodInfo.label} Mood</Badge>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-4 text-sm">
                  <div className="text-center bg-gray-50 rounded-lg p-2">
                    <div className="text-gray-500 text-xs mb-1">Mood</div>
                    <div className="text-blue-600 font-semibold">{checkIn.mood}/10</div>
                  </div>
                  <div className="text-center bg-gray-50 rounded-lg p-2">
                    <div className="text-gray-500 text-xs mb-1">Stress</div>
                    <div className="text-blue-600 font-semibold">{checkIn.stress}/10</div>
                  </div>
                  <div className="text-center bg-gray-50 rounded-lg p-2">
                    <div className="text-gray-500 text-xs mb-1">Sleep</div>
                    <div className="text-blue-600 font-semibold">{checkIn.sleep}/10</div>
                  </div>
                </div>
                {checkIn.concerns && checkIn.concerns.length > 0 && (
                  <div className="pt-3 border-t mb-3">
                    <span className="text-xs text-gray-500 uppercase tracking-wide mb-2 block">Concerns</span>
                    <div className="flex flex-wrap gap-1">
                      {checkIn.concerns.map((concern: string, idx: number) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {concern}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {checkIn.notes && (
                  <div className="pt-3 border-t">
                    <span className="text-xs text-gray-500 uppercase tracking-wide mb-1 block">Notes</span>
                    <p className="text-sm text-gray-700">{checkIn.notes}</p>
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

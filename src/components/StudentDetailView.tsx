import { ArrowLeft, TrendingDown, TrendingUp, Minus, Calendar, MessageSquare } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { useState } from 'react';

interface CheckIn {
  date: string;
  mood: number;
  stress: number;
  sleep: number;
  concerns: string[];
  notes: string;
}

interface Student {
  id: string;
  name: string;
  lastCheckIn: string;
  averageMood: number;
  alertLevel: 'none' | 'medium' | 'high';
  recentConcerns: string[];
  checkIns: CheckIn[];
}

interface StudentDetailViewProps {
  student: Student;
  onBack: () => void;
}

export function StudentDetailView({ student, onBack }: StudentDetailViewProps) {
  const [followUpNote, setFollowUpNote] = useState('');
  const [showFollowUpForm, setShowFollowUpForm] = useState(false);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getMoodTrend = () => {
    if (student.checkIns.length < 2) return null;
    const recent = student.checkIns[0].mood;
    const previous = student.checkIns[1].mood;
    if (recent > previous) return 'up';
    if (recent < previous) return 'down';
    return 'stable';
  };

  const moodTrend = getMoodTrend();

  const handleSaveFollowUp = () => {
    // In a real app, this would save to the database
    alert('Follow-up note saved successfully!');
    setFollowUpNote('');
    setShowFollowUpForm(false);
  };

  return (
    <div className="p-6 lg:p-8 max-w-3xl space-y-6">
      <div className="pt-2 flex items-center space-x-3">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="mb-1">{student.name}</h2>
          <p className="text-gray-600">Student Profile</p>
        </div>
      </div>

      {student.alertLevel !== 'none' && (
        <Card
          className={`p-4 ${
            student.alertLevel === 'high'
              ? 'bg-red-50 border-red-200'
              : 'bg-amber-50 border-amber-200'
          }`}
        >
          <div className="flex items-start space-x-3">
            <MessageSquare
              className={`w-5 h-5 ${
                student.alertLevel === 'high' ? 'text-red-600' : 'text-amber-600'
              }`}
            />
            <div className="flex-1">
              <div
                className={`mb-1 ${
                  student.alertLevel === 'high' ? 'text-red-900' : 'text-amber-900'
                }`}
              >
                {student.alertLevel === 'high' ? 'High Priority Alert' : 'Medium Priority Alert'}
              </div>
              <p
                className={`text-sm ${
                  student.alertLevel === 'high' ? 'text-red-800' : 'text-amber-800'
                }`}
              >
                {student.alertLevel === 'high'
                  ? 'Student may be experiencing significant emotional distress. Immediate follow-up recommended.'
                  : 'Student may benefit from counselor check-in. Schedule a session when possible.'}
              </p>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="text-sm text-gray-600 mb-1">Average Mood</div>
          <div className="flex items-center space-x-2">
            <span className="text-2xl text-blue-600">{student.averageMood.toFixed(1)}</span>
            {moodTrend === 'up' && <TrendingUp className="w-5 h-5 text-green-600" />}
            {moodTrend === 'down' && <TrendingDown className="w-5 h-5 text-red-600" />}
            {moodTrend === 'stable' && <Minus className="w-5 h-5 text-gray-400" />}
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-sm text-gray-600 mb-1">Total Check-Ins</div>
          <div className="text-2xl text-blue-600">{student.checkIns.length}</div>
        </Card>
      </div>

      {student.recentConcerns.length > 0 && (
        <Card className="p-4">
          <h3 className="mb-3">Recent Concerns</h3>
          <div className="flex flex-wrap gap-2">
            {student.recentConcerns.map((concern, idx) => (
              <Badge key={idx} variant="outline" className="text-sm">
                {concern}
              </Badge>
            ))}
          </div>
        </Card>
      )}

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3>Check-In History</h3>
          <Button
            size="sm"
            onClick={() => setShowFollowUpForm(!showFollowUpForm)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {showFollowUpForm ? 'Cancel' : 'Schedule Follow-Up'}
          </Button>
        </div>

        {showFollowUpForm && (
          <Card className="p-4 mb-4 bg-blue-50 border-blue-200">
            <h4 className="text-blue-900 mb-3">Follow-Up Notes</h4>
            <Textarea
              placeholder="Enter follow-up notes, action items, or referrals..."
              value={followUpNote}
              onChange={(e) => setFollowUpNote(e.target.value)}
              rows={4}
              className="mb-3 bg-white"
            />
            <div className="flex space-x-2">
              <Button
                onClick={handleSaveFollowUp}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                Save Follow-Up
              </Button>
              <Button
                onClick={() => {
                  setShowFollowUpForm(false);
                  setFollowUpNote('');
                }}
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </Card>
        )}

        <div className="space-y-3">
          {student.checkIns.map((checkIn, idx) => (
            <Card key={idx} className="p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">{formatDate(checkIn.date)}</span>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-3 text-sm">
                <div>
                  <span className="text-gray-600">Mood:</span>
                  <span className="text-blue-600 ml-2">{checkIn.mood}/10</span>
                </div>
                <div>
                  <span className="text-gray-600">Stress:</span>
                  <span className="text-blue-600 ml-2">{checkIn.stress}/10</span>
                </div>
                <div>
                  <span className="text-gray-600">Sleep:</span>
                  <span className="text-blue-600 ml-2">{checkIn.sleep}/10</span>
                </div>
              </div>
              {checkIn.concerns.length > 0 && (
                <div className="mb-3">
                  <div className="text-sm text-gray-600 mb-2">Concerns:</div>
                  <div className="flex flex-wrap gap-1">
                    {checkIn.concerns.map((concern, concernIdx) => (
                      <Badge key={concernIdx} variant="outline" className="text-xs">
                        {concern}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {checkIn.notes && (
                <div className="pt-3 border-t">
                  <div className="text-sm text-gray-600 mb-1">Notes:</div>
                  <p className="text-sm text-gray-700">{checkIn.notes}</p>
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { ArrowLeft, Calendar, MessageSquare } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import type { CounselorStudent } from './CounselorDashboard';

interface StudentDetailViewProps {
  student: CounselorStudent;
  onBack: () => void;
}

export function StudentDetailView({ student, onBack }: StudentDetailViewProps) {
  const [followUpNote, setFollowUpNote] = useState('');
  const [showFollowUpForm, setShowFollowUpForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const formatDate = (dateString: string) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

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
      <div className="pt-2 flex items-center space-x-3">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="mb-0.5">{student.name}</h2>
          <p className="text-gray-500 text-sm">Student Profile</p>
        </div>
      </div>

      {student.alertLevel !== 'none' && (
        <Card className={`p-4 ${student.alertLevel === 'high' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
          <div className="flex items-start space-x-3">
            <MessageSquare className={`w-5 h-5 flex-shrink-0 ${student.alertLevel === 'high' ? 'text-red-600' : 'text-amber-600'}`} />
            <div>
              <p className={`font-medium mb-1 ${student.alertLevel === 'high' ? 'text-red-900' : 'text-amber-900'}`}>
                {student.alertLevel === 'high' ? 'High Priority Alert' : 'Medium Priority Alert'}
              </p>
              <p className={`text-sm ${student.alertLevel === 'high' ? 'text-red-800' : 'text-amber-800'}`}>
                {student.alertLevel === 'high'
                  ? 'Student may be experiencing significant distress. Immediate follow-up recommended.'
                  : 'Student may benefit from a counselor check-in. Schedule a session when possible.'}
              </p>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="text-sm text-gray-500 mb-1">Total Check-Ins</div>
          <div className="text-2xl text-blue-600">{student.checkIns.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-500 mb-1">Last Check-In</div>
          <div className="text-sm text-gray-800">{formatDate(student.lastCheckIn)}</div>
        </Card>
      </div>

      {student.recentConcerns.length > 0 && (
        <Card className="p-4">
          <h3 className="mb-3 text-sm font-medium text-gray-700">Recent Concerns</h3>
          <div className="flex flex-wrap gap-2">
            {student.recentConcerns.map((concern, idx) => (
              <Badge key={idx} variant="outline">{concern}</Badge>
            ))}
          </div>
        </Card>
      )}

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3>Check-In Responses</h3>
          <Button
            size="sm"
            onClick={() => setShowFollowUpForm(!showFollowUpForm)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {showFollowUpForm ? 'Cancel' : 'Add Follow-Up Note'}
          </Button>
        </div>

        {showFollowUpForm && (
          <Card className="p-4 mb-4 bg-blue-50 border-blue-200">
            <h4 className="text-blue-900 mb-3 text-sm font-medium">Follow-Up Note</h4>
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
                disabled={saving || !followUpNote.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {saving ? 'Saving…' : 'Save Note'}
              </Button>
              <Button
                onClick={() => { setShowFollowUpForm(false); setFollowUpNote(''); }}
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </Card>
        )}

        {student.checkIns.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-gray-500 text-sm">No check-ins submitted yet.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {student.checkIns.map((checkIn, idx) => (
              <Card key={idx} className="p-5">
                <div className="flex items-center space-x-2 mb-4">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-500">{formatDate(checkIn.date)}</span>
                </div>
                <div className="space-y-3">
                  {checkIn.answers
                    .filter((a) => a.answer.trim().length > 0)
                    .map((a) => (
                      <div key={a.questionId} className="text-sm border-l-2 border-blue-100 pl-3">
                        <p className="text-gray-500 mb-0.5">{a.question}</p>
                        <p className="text-gray-800">{a.answer}</p>
                      </div>
                    ))}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

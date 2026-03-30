import { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Slider } from './ui/slider';
import { Checkbox } from './ui/checkbox';
import type { StudentOutletContext } from './StudentDashboard';

const concernOptions = [
  'Academic pressure',
  'Social relationships',
  'Family issues',
  'Financial stress',
  'Health concerns',
  'Loneliness',
  'Future/career anxiety',
  'Other',
];

export function CheckInQuestionnaire() {
  const { handleCheckInSubmit } = useOutletContext<StudentOutletContext>();
  const navigate = useNavigate();

  const [mood, setMood] = useState([5]);
  const [stress, setStress] = useState([5]);
  const [sleep, setSleep] = useState([5]);
  const [concerns, setConcerns] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  const handleConcernToggle = (concern: string) => {
    setConcerns((prev) =>
      prev.includes(concern)
        ? prev.filter((c) => c !== concern)
        : [...prev, concern]
    );
  };

  const handleSubmit = () => {
    handleCheckInSubmit({
      mood: mood[0],
      stress: stress[0],
      sleep: sleep[0],
      concerns,
      notes,
    });
  };

  const getMoodEmoji = (value: number) => {
    if (value <= 3) return '😔';
    if (value <= 5) return '😐';
    if (value <= 7) return '🙂';
    return '😊';
  };

  return (
    <div className="p-6 lg:p-8 max-w-4xl space-y-6">
      <div className="pt-2">
        <h2 className="text-2xl mb-1">Daily Check-In</h2>
        <p className="text-gray-600">Help us understand how you're feeling today</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left column: sliders */}
        <Card className="p-6 space-y-6">
          <h3 className="text-gray-900">How are you doing?</h3>

          <div>
            <div className="flex items-center justify-between mb-3">
              <Label>Mood</Label>
              <span className="text-2xl">{getMoodEmoji(mood[0])}</span>
            </div>
            <Slider
              value={mood}
              onValueChange={setMood}
              min={1}
              max={10}
              step={1}
              className="mb-2"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>Very Low</span>
              <span className="text-blue-600 font-medium">{mood[0]}/10</span>
              <span>Very High</span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <Label>Stress Level</Label>
            </div>
            <Slider
              value={stress}
              onValueChange={setStress}
              min={1}
              max={10}
              step={1}
              className="mb-2"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>No Stress</span>
              <span className="text-blue-600 font-medium">{stress[0]}/10</span>
              <span>Very Stressed</span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <Label>Sleep Quality</Label>
            </div>
            <Slider
              value={sleep}
              onValueChange={setSleep}
              min={1}
              max={10}
              step={1}
              className="mb-2"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>Very Poor</span>
              <span className="text-blue-600 font-medium">{sleep[0]}/10</span>
              <span>Excellent</span>
            </div>
          </div>
        </Card>

        {/* Right column: concerns + notes */}
        <div className="space-y-6">
          <Card className="p-6">
            <Label className="mb-4 block">What's on your mind? (Select all that apply)</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
              {concernOptions.map((concern) => (
                <div key={concern} className="flex items-center space-x-2">
                  <Checkbox
                    id={concern}
                    checked={concerns.includes(concern)}
                    onCheckedChange={() => handleConcernToggle(concern)}
                  />
                  <label htmlFor={concern} className="text-sm cursor-pointer">
                    {concern}
                  </label>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <Label htmlFor="notes" className="mb-2 block">
              Additional Notes (Optional)
            </Label>
            <Textarea
              id="notes"
              placeholder="Share anything else that's on your mind..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </Card>
        </div>
      </div>

      {(mood[0] <= 3 || stress[0] >= 8) && (
        <Card className="p-4 bg-amber-50 border-amber-200">
          <p className="text-sm text-amber-900">
            We notice you might be going through a difficult time. Please consider reaching
            out to a guidance counselor or trusted adult for support.
          </p>
        </Card>
      )}

      <div className="flex space-x-3 max-w-sm">
        <Button onClick={() => navigate('/student/home')} variant="outline" className="flex-1">
          Cancel
        </Button>
        <Button onClick={handleSubmit} className="flex-1 bg-blue-600 hover:bg-blue-700">
          Submit Check-In
        </Button>
      </div>
    </div>
  );
}

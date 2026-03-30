import { useNavigate } from 'react-router-dom';
import { useOutletContext } from 'react-router-dom';
import { Heart, TrendingUp, Calendar, Sparkles } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import type { StudentOutletContext } from './StudentDashboard';

export function StudentHome() {
  const { checkIns } = useOutletContext<StudentOutletContext>();
  const navigate = useNavigate();

  const lastCheckIn = checkIns[0];
  const daysSinceLastCheckIn = lastCheckIn
    ? Math.floor((Date.now() - new Date(lastCheckIn.date).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const averageMood = checkIns.length > 0
    ? (checkIns.reduce((sum, c) => sum + c.mood, 0) / checkIns.length).toFixed(1)
    : 0;

  return (
    <div className="p-6 lg:p-8 max-w-4xl space-y-6">
      <div className="flex items-center space-x-4 py-2">
        <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
          <Heart className="w-7 h-7 text-blue-600" fill="currentColor" />
        </div>
        <div>
          <h2 className="text-2xl">Welcome Back!</h2>
          <p className="text-gray-600">How are you feeling today?</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5" />
              <span className="font-medium">Daily Check-In</span>
            </div>
            <Sparkles className="w-5 h-5" />
          </div>
          <p className="text-blue-100 mb-6 text-sm">
            {daysSinceLastCheckIn === 0
              ? "You've completed your check-in today! Come back tomorrow."
              : daysSinceLastCheckIn === 1
              ? "It's been a day since your last check-in."
              : daysSinceLastCheckIn
              ? `It's been ${daysSinceLastCheckIn} days since your last check-in.`
              : "Start your first well-being check-in today!"}
          </p>
          <Button
            onClick={() => navigate('/student/checkin')}
            className="bg-white text-blue-600 hover:bg-blue-50 px-6"
          >
            Start Check-In
          </Button>
        </Card>

        <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
          <Card className="p-4 text-center">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Heart className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-3xl font-semibold text-blue-600 mb-1">{averageMood}</div>
            <div className="text-sm text-gray-600">Avg Mood</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-3xl font-semibold text-blue-600 mb-1">{checkIns.length}</div>
            <div className="text-sm text-gray-600">Check-Ins</div>
          </Card>
        </div>
      </div>

      <Card className="p-6 bg-blue-50 border-blue-200">
        <h3 className="text-blue-900 mb-3">Quick Tips</h3>
        <ul className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-blue-800">
          <li className="flex items-start space-x-2">
            <span className="mt-0.5 text-blue-400">•</span>
            <span>Take regular breaks during study sessions</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="mt-0.5 text-blue-400">•</span>
            <span>Practice deep breathing when feeling stressed</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="mt-0.5 text-blue-400">•</span>
            <span>Reach out to friends or counselors when you need support</span>
          </li>
        </ul>
      </Card>
    </div>
  );
}

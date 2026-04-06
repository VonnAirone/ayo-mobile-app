import { useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Heart, TrendingUp, Calendar, Sparkles, Flame } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { calculateStreak, hasCheckedInToday } from '../lib/streak';
import type { StudentOutletContext, CheckIn } from './StudentDashboard';

function getLatestMoodEmoji(checkIns: CheckIn[]): string {
  const mood = checkIns[0]?.answers.find((a) => a.questionId === 'mood')?.answer ?? '';
  if (mood.includes('Great')) return '😊';
  if (mood.includes('Good')) return '🙂';
  if (mood.includes('Okay')) return '😐';
  if (mood.includes('Low')) return '😔';
  if (mood.includes('struggling')) return '😞';
  return '—';
}

function requestNotificationPermission() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

function showCheckInReminder() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  new Notification('Daily check-in reminder 💙', {
    body: "Take a moment to reflect on how you're feeling today.",
    icon: '/favicon.ico',
  });
}

export function StudentHome() {
  const { checkIns } = useOutletContext<StudentOutletContext>();
  const navigate = useNavigate();

  const lastCheckIn = checkIns[0];
  const daysSinceLastCheckIn = lastCheckIn
    ? Math.floor((Date.now() - new Date(lastCheckIn.date).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const streak = calculateStreak(checkIns);
  const checkedInToday = hasCheckedInToday(checkIns);
  const latestMoodEmoji = getLatestMoodEmoji(checkIns);

  // Request notification permission and remind if not checked in today
  useEffect(() => {
    requestNotificationPermission();

    if (checkedInToday) return;

    const timer = setTimeout(() => {
      showCheckInReminder();
    }, 5000); // remind after 5s if they haven't checked in

    return () => clearTimeout(timer);
  }, [checkedInToday]);

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
            {checkedInToday
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
            disabled={checkedInToday}
          >
            {checkedInToday ? 'Done for today' : 'Start Check-In'}
          </Button>
        </Card>

        <div className="grid grid-cols-3 lg:grid-cols-1 gap-4">
          <Card className="p-4 text-center">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Heart className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-3xl mb-1">{latestMoodEmoji}</div>
            <div className="text-sm text-gray-600">Last Mood</div>
          </Card>

          <Card className="p-4 text-center">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-3xl font-semibold text-blue-600 mb-1">{checkIns.length}</div>
            <div className="text-sm text-gray-600">Check-Ins</div>
          </Card>

          <Card className="p-4 text-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2 ${streak > 0 ? 'bg-orange-100' : 'bg-gray-100'}`}>
              <Flame className={`w-5 h-5 ${streak > 0 ? 'text-orange-500' : 'text-gray-400'}`} />
            </div>
            <div className={`text-3xl font-semibold mb-1 ${streak > 0 ? 'text-orange-500' : 'text-gray-400'}`}>
              {streak}
            </div>
            <div className="text-sm text-gray-600">Day Streak</div>
          </Card>
        </div>
      </div>

      {streak >= 3 && (
        <Card className="p-4 bg-orange-50 border-orange-200 flex items-center space-x-3">
          <Flame className="w-6 h-6 text-orange-500 flex-shrink-0" />
          <p className="text-sm text-orange-800">
            <span className="font-semibold">{streak}-day streak!</span>{' '}
            {streak >= 7 ? "You're on fire — keep it going!" : "Great consistency, keep it up!"}
          </p>
        </Card>
      )}

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

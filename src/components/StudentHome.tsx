import { useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Heart, TrendingUp, Calendar, Sparkles, Flame } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { calculateStreak, hasCheckedInToday } from '../lib/streak';
import { daysSince } from '../lib/dates';
import type { StudentOutletContext, CheckIn } from './StudentDashboard';

const CRISIS_IDS = new Set([
  'home_abuse', 'edu_bullying', 'safety_suicidal_thoughts', 'repro_forced',
  'mh_wished_dead', 'mh_family_better_off', 'mh_thoughts_killing', 'mh_tried_kill', 'mh_current_thoughts',
]);

function getLatestStatusEmoji(checkIns: CheckIn[]): string {
  const answers = checkIns[0]?.answers ?? [];
  if (answers.length === 0) return '—';
  if (answers.some((a) => CRISIS_IDS.has(a.questionId) && a.answer === 'Yes')) return '⚠️';
  if (answers.find((a) => a.questionId === 'counseling')?.answer === 'Yes') return '🤝';
  return '✅';
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
  const daysSinceLastCheckIn = lastCheckIn ? daysSince(lastCheckIn.date) : null;

  const streak = calculateStreak(checkIns);
  const checkedInToday = hasCheckedInToday(checkIns);
  const latestMoodEmoji = getLatestStatusEmoji(checkIns);

  useEffect(() => {
    requestNotificationPermission();

    if (checkedInToday) return;

    const timer = setTimeout(() => {
      showCheckInReminder();
    }, 5000);

    return () => clearTimeout(timer);
  }, [checkedInToday]);

  return (
    <div className="p-6 lg:p-8 max-w-4xl space-y-5">
      {/* Welcome header */}
      <div className="flex items-center space-x-4 py-2">
        <div className="w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center flex-shrink-0">
          <Heart className="w-7 h-7 text-teal-500" fill="currentColor" />
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-slate-800">Welcome back</h2>
          <p className="text-slate-500 text-sm">How are you feeling today?</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Daily check-in card */}
        <Card className="lg:col-span-2 p-6 bg-gradient-to-br from-teal-500 to-teal-700 text-white border-0 shadow-md rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center">
                <Calendar className="w-4 h-4 text-white" />
              </div>
              <span className="font-medium text-sm">Daily Check-In</span>
            </div>
            <Sparkles className="w-4 h-4 text-teal-200" />
          </div>

          <p className="text-teal-100 mb-6 text-sm leading-relaxed">
            {checkedInToday
              ? "You've completed your check-in today. See you tomorrow!"
              : daysSinceLastCheckIn === 1
              ? "It's been a day since your last check-in."
              : daysSinceLastCheckIn
              ? `It's been ${daysSinceLastCheckIn} days since your last check-in.`
              : "Start your first well-being check-in today."}
          </p>

          <Button
            onClick={() => navigate('/student/checkin')}
            className="bg-white text-teal-700 hover:bg-teal-50 px-6 rounded-xl font-medium text-sm shadow-sm"
            disabled={checkedInToday}
          >
            {checkedInToday ? 'Done for today ✓' : 'Start Check-In'}
          </Button>
        </Card>

        {/* Stat cards */}
        <div className="grid grid-cols-3 lg:grid-cols-1 gap-4">
          <Card className="p-4 text-center border border-stone-100 rounded-2xl shadow-sm">
            <div className="w-9 h-9 bg-teal-50 rounded-xl flex items-center justify-center mx-auto mb-2">
              <Heart className="w-4.5 h-4.5 text-teal-500" />
            </div>
            <div className="text-2xl mb-0.5">{latestMoodEmoji}</div>
            <div className="text-xs text-slate-400 font-medium">Last Status</div>
          </Card>

          <Card className="p-4 text-center border border-stone-100 rounded-2xl shadow-sm">
            <div className="w-9 h-9 bg-teal-50 rounded-xl flex items-center justify-center mx-auto mb-2">
              <TrendingUp className="w-4.5 h-4.5 text-teal-500" />
            </div>
            <div className="text-2xl font-semibold text-teal-600 mb-0.5">{checkIns.length}</div>
            <div className="text-xs text-slate-400 font-medium">Check-Ins</div>
          </Card>

          <Card className="p-4 text-center border border-stone-100 rounded-2xl shadow-sm">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mx-auto mb-2 ${streak > 0 ? 'bg-orange-50' : 'bg-stone-100'}`}>
              <Flame className={`w-4.5 h-4.5 ${streak > 0 ? 'text-orange-400' : 'text-slate-300'}`} />
            </div>
            <div className={`text-2xl font-semibold mb-0.5 ${streak > 0 ? 'text-orange-400' : 'text-slate-300'}`}>
              {streak}
            </div>
            <div className="text-xs text-slate-400 font-medium">Day Streak</div>
          </Card>
        </div>
      </div>

      {/* Streak celebration */}
      {streak >= 3 && (
        <Card className="p-4 bg-orange-50 border border-orange-100 rounded-2xl flex items-center space-x-3 shadow-sm">
          <div className="w-9 h-9 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Flame className="w-5 h-5 text-orange-400" />
          </div>
          <p className="text-sm text-orange-700">
            <span className="font-semibold">{streak}-day streak!</span>{' '}
            {streak >= 7 ? "You're doing amazing — keep it going!" : "Great consistency. You should be proud."}
          </p>
        </Card>
      )}

      {/* Quick tips */}
      <Card className="p-5 bg-white border border-stone-100 rounded-2xl shadow-sm">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Gentle reminders</h3>
        <ul className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            'Take regular breaks during study sessions',
            'Practice deep breathing when feeling stressed',
            'Reach out to friends or counselors when you need support',
          ].map((tip, i) => (
            <li key={i} className="flex items-start space-x-2.5">
              <span className="w-1.5 h-1.5 bg-teal-400 rounded-full mt-1.5 flex-shrink-0" />
              <span className="text-sm text-slate-500 leading-relaxed">{tip}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

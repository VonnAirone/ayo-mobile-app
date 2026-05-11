import { useEffect, useMemo } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Heart, TrendingUp, Calendar, Sparkles, Flame, CheckCircle2, HandHeart, LifeBuoy } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { useAuth } from '../lib/AuthContext';
import { calculateStreak, hasCheckedInToday } from '../lib/streak';
import { daysSince } from '../lib/dates';
import { isCrisisAnswer, MOOD_SCORE } from '../lib/severity';
import type { StudentOutletContext, CheckIn } from './StudentDashboard';

type StatusKind = 'support' | 'counseling' | 'complete' | 'empty';

interface LatestStatus {
  kind: StatusKind;
  title: string;
  subtitle: string;
  Icon: typeof Heart;
  iconColor: string;
  iconBg: string;
  titleColor: string;
}

const AFFIRMATIONS = [
  'You are doing better than you think.',
  'One small step is still progress.',
  'Your feelings are valid — every one of them.',
  'Rest is productive too.',
  'You belong here. You matter.',
  'Today is a new chance to be gentle with yourself.',
  'Breathe. You’ve made it through every hard day so far.',
];

function getGreeting(hour: number): { greeting: string; emoji: string } {
  if (hour < 5) return { greeting: 'Resting well', emoji: '\u{1F319}' };
  if (hour < 12) return { greeting: 'Good morning', emoji: '\u{1F33F}' };
  if (hour < 17) return { greeting: 'Good afternoon', emoji: '☀️' };
  if (hour < 21) return { greeting: 'Good evening', emoji: '\u{1F30C}' };
  return { greeting: 'Winding down', emoji: '\u{1F319}' };
}

function getLatestStatus(checkIns: CheckIn[]): LatestStatus {
  const latest = checkIns[0];
  const answers = latest?.answers ?? [];

  if (answers.length === 0) {
    return {
      kind: 'empty',
      title: 'No status yet',
      subtitle: 'Start your first check-in',
      Icon: Heart,
      iconColor: 'text-slate-300',
      iconBg: 'bg-stone-100',
      titleColor: 'text-slate-400',
    };
  }

  const days = daysSince(latest.date);
  const when = days === 0 ? 'Today' : days === 1 ? 'Yesterday' : `${days} days ago`;

  if (answers.some(isCrisisAnswer)) {
    return {
      kind: 'support',
      title: 'Support on the way',
      subtitle: 'Your counselor has been notified',
      Icon: LifeBuoy,
      iconColor: 'text-rose-400',
      iconBg: 'bg-rose-50',
      titleColor: 'text-rose-600',
    };
  }

  if (answers.find((a) => a.questionId === 'counseling')?.answer === 'Yes') {
    return {
      kind: 'counseling',
      title: 'Counseling requested',
      subtitle: `Checked in ${when.toLowerCase()}`,
      Icon: HandHeart,
      iconColor: 'text-teal-500',
      iconBg: 'bg-teal-50',
      titleColor: 'text-teal-700',
    };
  }

  return {
    kind: 'complete',
    title: 'Check-in complete',
    subtitle: when,
    Icon: CheckCircle2,
    iconColor: 'text-teal-500',
    iconBg: 'bg-teal-50',
    titleColor: 'text-slate-700',
  };
}

interface MoodPoint {
  date: string;
  hasEntry: boolean;
  level: 0 | 1 | 2 | 3; // 0 = no entry, 1 = struggling, 2 = okay, 3 = good
}

function buildLast7Days(checkIns: CheckIn[]): MoodPoint[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(today);
    day.setDate(today.getDate() - (6 - i));
    const dayStr = day.toISOString().split('T')[0];

    const entry = checkIns.find((c) => c.date.startsWith(dayStr));
    if (!entry) {
      return { date: dayStr, hasEntry: false, level: 0 };
    }

    const moodAnswer = entry.answers.find((a) => a.questionId === 'mood')?.answer ?? '';
    const score = MOOD_SCORE[moodAnswer] ?? 0;
    const hasCrisis = entry.answers.some(isCrisisAnswer);

    let level: MoodPoint['level'] = 3;
    if (hasCrisis || score === 2) level = 1;
    else if (score === 1) level = 2;
    return { date: dayStr, hasEntry: true, level };
  });
}

function requestNotificationPermission() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

function showCheckInReminder() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  new Notification('Daily check-in reminder \u{1F499}', {
    body: "Take a moment to reflect on how you're feeling today.",
    icon: '/favicon.ico',
  });
}

export function StudentHome() {
  const { checkIns } = useOutletContext<StudentOutletContext>();
  const { profile } = useAuth();
  const navigate = useNavigate();

  const lastCheckIn = checkIns[0];
  const daysSinceLastCheckIn = lastCheckIn ? daysSince(lastCheckIn.date) : null;

  const streak = calculateStreak(checkIns);
  const checkedInToday = hasCheckedInToday(checkIns);
  const latestStatus = getLatestStatus(checkIns);
  const { greeting, emoji } = getGreeting(new Date().getHours());

  const firstName = profile?.name?.split(' ')[0] ?? '';

  const affirmation = useMemo(() => {
    const idx = new Date().getDate() % AFFIRMATIONS.length;
    return AFFIRMATIONS[idx];
  }, []);

  const last7 = useMemo(() => buildLast7Days(checkIns), [checkIns]);
  const dayLabels = useMemo(
    () =>
      last7.map((p) =>
        new Date(p.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'narrow' })
      ),
    [last7]
  );

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
      <div className="flex items-center justify-between py-2">
        <div className="flex items-center space-x-4">
          <div className="relative w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center flex-shrink-0">
            <Heart className="w-7 h-7 text-teal-500" fill="currentColor" />
            <span className="absolute inset-0 rounded-2xl bg-teal-300/40 animate-breathe" aria-hidden="true" />
          </div>
          <div>
            <h2 className="font-display text-3xl font-medium text-slate-800 tracking-tight">
              {greeting}{firstName ? `, ${firstName}` : ''} <span className="ml-0.5">{emoji}</span>
            </h2>
            <p className="text-slate-500 text-sm">{affirmation}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Daily check-in card */}
        <Card className="relative overflow-hidden lg:col-span-2 p-6 bg-gradient-to-br from-teal-600 via-teal-500 to-emerald-400 text-white border-0 rounded-3xl">
          {/* Soft floating blobs */}
          <span className="blob animate-float-slow" style={{ width: 220, height: 220, background: '#fef3c7', top: -60, right: -60 }} aria-hidden="true" />
          <span className="blob animate-float-slow" style={{ width: 180, height: 180, background: '#a7f3d0', bottom: -80, left: -40, animationDelay: '2s' }} aria-hidden="true" />

          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                  <Calendar className="w-4 h-4 text-white" />
                </div>
                <span className="font-medium text-sm">Daily Check-In</span>
              </div>
              <Sparkles className="w-4 h-4 text-teal-100" />
            </div>

            <p className="text-teal-50 mb-6 text-sm leading-relaxed max-w-sm">
              {checkedInToday
                ? 'You showed up today. That alone is a win — see you tomorrow.'
                : daysSinceLastCheckIn === 1
                ? "It's been a day. Take a quiet moment to check in with yourself."
                : daysSinceLastCheckIn
                ? `It's been ${daysSinceLastCheckIn} days. Your feelings deserve a moment of attention.`
                : 'Start your first check-in. There are no wrong answers here.'}
            </p>

            <Button
              onClick={() => navigate('/student/checkin')}
              className="bg-white text-teal-700 hover:bg-teal-50 px-6 rounded-2xl font-medium text-sm shadow-sm"
              disabled={checkedInToday}
            >
              {checkedInToday ? 'Done for today ✓' : 'Begin Check-In'}
            </Button>
          </div>
        </Card>

        {/* Stat cards */}
        <div className="grid grid-cols-3 lg:grid-cols-1 gap-3 lg:gap-3">
          <Card className="p-3 lg:p-3.5 flex flex-col lg:flex-row lg:items-center text-center lg:text-left lg:gap-3 border border-stone-200/70 rounded-2xl bg-white">
            <div className={`w-8 h-8 lg:w-10 lg:h-10 ${latestStatus.iconBg} rounded-xl flex items-center justify-center mx-auto lg:mx-0 mb-1.5 lg:mb-0 flex-shrink-0`}>
              <latestStatus.Icon className={`w-4 h-4 lg:w-5 lg:h-5 ${latestStatus.iconColor}`} />
            </div>
            <div className="min-w-0 flex-1 flex flex-col items-center lg:items-start justify-end">
              <div className={`text-xs lg:text-sm font-semibold leading-tight ${latestStatus.titleColor}`}>
                {latestStatus.title}
              </div>
              <div className="text-[11px] lg:text-xs text-slate-400 font-medium leading-tight mt-1">
                {latestStatus.subtitle}
              </div>
            </div>
          </Card>

          <Card className="p-3 lg:p-3.5 flex flex-col lg:flex-row lg:items-center text-center lg:text-left lg:gap-3 border border-stone-200/70 rounded-2xl bg-white">
            <div className="w-8 h-8 lg:w-10 lg:h-10 bg-teal-50 rounded-xl flex items-center justify-center mx-auto lg:mx-0 mb-1.5 lg:mb-0 flex-shrink-0">
              <TrendingUp className="w-4 h-4 lg:w-5 lg:h-5 text-teal-500" />
            </div>
            <div className="min-w-0 flex-1 flex flex-col items-center lg:items-start justify-end">
              <div className="text-xl lg:text-2xl font-semibold text-teal-600 leading-none">{checkIns.length}</div>
              <div className="text-[11px] lg:text-xs text-slate-400 font-medium leading-tight mt-1">Check-Ins</div>
            </div>
          </Card>

          <Card className="p-3 lg:p-3.5 flex flex-col lg:flex-row lg:items-center text-center lg:text-left lg:gap-3 border border-stone-200/70 rounded-2xl bg-white">
            <div className={`w-8 h-8 lg:w-10 lg:h-10 rounded-xl flex items-center justify-center mx-auto lg:mx-0 mb-1.5 lg:mb-0 flex-shrink-0 ${streak > 0 ? 'bg-orange-50' : 'bg-stone-100'}`}>
              <Flame className={`w-4 h-4 lg:w-5 lg:h-5 ${streak > 0 ? 'text-orange-400' : 'text-slate-300'}`} />
            </div>
            <div className="min-w-0 flex-1 flex flex-col items-center lg:items-start justify-end">
              <div className={`text-xl lg:text-2xl font-semibold leading-none ${streak > 0 ? 'text-orange-400' : 'text-slate-300'}`}>
                {streak}
              </div>
              <div className="text-[11px] lg:text-xs text-slate-400 font-medium leading-tight mt-1">Day Streak</div>
            </div>
          </Card>
        </div>
      </div>

      {/* 7-day mood mini-chart */}
      <Card className="p-5 bg-white/80 backdrop-blur-sm border border-stone-200/70 rounded-2xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-700">This week</h3>
            <p className="text-xs text-slate-400 mt-0.5">A gentle look at your last 7 days</p>
          </div>
          {checkIns.length > 0 && (
            <div className="hidden sm:flex items-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-teal-400" /> Good
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-300" /> Okay
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-300" /> Tough
              </span>
            </div>
          )}
        </div>

        <div className="flex items-end justify-between gap-1.5 h-24">
          {last7.map((point, idx) => {
            const heightPct = point.hasEntry ? 35 + point.level * 22 : 18;
            const dotColor =
              !point.hasEntry
                ? 'bg-stone-200'
                : point.level === 3
                ? 'bg-teal-400'
                : point.level === 2
                ? 'bg-amber-300'
                : 'bg-rose-300';
            const barColor =
              !point.hasEntry
                ? 'bg-stone-100'
                : point.level === 3
                ? 'bg-teal-100'
                : point.level === 2
                ? 'bg-amber-100'
                : 'bg-rose-100';
            return (
              <div key={point.date} className="flex-1 flex flex-col items-center gap-1.5">
                <div
                  className={`w-full rounded-full ${barColor} relative flex items-start justify-center pt-1`}
                  style={{ height: `${heightPct}%`, transition: 'height 400ms ease-out' }}
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${dotColor}`} />
                </div>
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">
                  {dayLabels[idx]}
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Streak celebration */}
      {streak >= 3 && (
        <Card className="p-4 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200/70 rounded-2xl flex items-center space-x-3">
          <div className="w-9 h-9 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Flame className="w-5 h-5 text-orange-400" />
          </div>
          <p className="text-sm text-orange-700">
            <span className="font-semibold">{streak}-day streak!</span>{' '}
            {streak >= 7 ? "You're doing amazing — keep it going." : 'Great consistency. You should be proud.'}
          </p>
        </Card>
      )}

      {/* Quick tips */}
      <Card className="p-5 bg-white/80 backdrop-blur-sm border border-stone-200/70 rounded-2xl">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Gentle reminders</h3>
        <ul className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            'Take small breaks during long study sessions',
            'Try a slow breath in and out when feeling stressed',
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

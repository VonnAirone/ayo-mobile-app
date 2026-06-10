import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Bell,
  CheckCheck,
  ClipboardCheck,
  HeartHandshake,
  LogIn,
  UserPlus,
  X,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { ActivityType } from '../lib/activity';
import { moodFromKey } from '../lib/mood';

interface ActivityEvent {
  id: string;
  student_id: string;
  type: ActivityType;
  metadata: Record<string, unknown> | null;
  created_at: string;
  profiles: { name: string } | null;
}

interface Props {
  variant?: 'header' | 'sidebar';
}

const LAST_SEEN_KEY = 'ayo_counselor_notifications_last_seen';

function formatRelativeTime(dateString: string): string {
  const d = new Date(dateString);
  const diffMin = Math.floor((Date.now() - d.getTime()) / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h ago`;
  if (diffMin < 1440 * 7) return `${Math.floor(diffMin / 1440)}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatFullDateTime(dateString: string): string {
  const d = new Date(dateString);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: sameYear ? undefined : 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

interface EventVisual {
  icon: typeof Bell;
  iconColor: string;
  bg: string;
  ring: string;
  label: string;
}

function visualFor(type: ActivityType): EventVisual {
  switch (type) {
    case 'signup':
      return {
        icon: UserPlus,
        iconColor: 'text-violet-600',
        bg: 'bg-violet-50',
        ring: 'ring-violet-100',
        label: 'New signup',
      };
    case 'login':
      return {
        icon: LogIn,
        iconColor: 'text-sky-600',
        bg: 'bg-sky-50',
        ring: 'ring-sky-100',
        label: 'Logged in',
      };
    case 'checkin':
      return {
        icon: ClipboardCheck,
        iconColor: 'text-emerald-600',
        bg: 'bg-emerald-50',
        ring: 'ring-emerald-100',
        label: 'Submitted check-in',
      };
    case 'crisis':
      return {
        icon: AlertTriangle,
        iconColor: 'text-rose-600',
        bg: 'bg-rose-50',
        ring: 'ring-rose-100',
        label: 'Crisis flag triggered',
      };
    case 'concern':
      return {
        icon: HeartHandshake,
        iconColor: 'text-amber-600',
        bg: 'bg-amber-50',
        ring: 'ring-amber-100',
        label: 'May need support',
      };
  }
}

function describeEvent(event: ActivityEvent): string {
  const name = event.profiles?.name ?? 'A student';
  const meta = event.metadata ?? {};
  switch (event.type) {
    case 'signup':
      return `${name} created a new account.`;
    case 'login':
      return `${name} signed in.`;
    case 'checkin': {
      const mood = moodFromKey(typeof meta.mood === 'string' ? meta.mood : null);
      const pct = typeof meta.percentage === 'number' ? ` (${meta.percentage}%)` : '';
      return mood
        ? `${name} submitted a check-in — ${mood.label}${pct}.`
        : `${name} submitted a check-in.`;
    }
    case 'concern': {
      const mood = moodFromKey(typeof meta.mood === 'string' ? meta.mood : null);
      const pct = typeof meta.percentage === 'number' ? ` (${meta.percentage}%)` : '';
      return mood
        ? `${name}'s check-in suggests they may need support — ${mood.label}${pct}.`
        : `${name}'s check-in suggests they may need support.`;
    }
    case 'crisis': {
      const questions = Array.isArray(meta.questions) ? meta.questions : [];
      return questions.length > 0
        ? `${name} flagged a crisis response: "${String(questions[0])}"${
            questions.length > 1 ? ` (+${questions.length - 1} more)` : ''
          }`
        : `${name} flagged a crisis response.`;
    }
  }
}

export function CounselorNotifications({ variant = 'header' }: Props) {
  const navigate = useNavigate();
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [open, setOpen] = useState(false);
  const [lastSeen, setLastSeen] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLastSeen(localStorage.getItem(LAST_SEEN_KEY) ?? '');

    let cancelled = false;
    async function load() {
      const { data, error } = await supabase
        .from('activity_events')
        .select('id, student_id, type, metadata, created_at, profiles!inner(name)')
        .order('created_at', { ascending: false })
        .limit(100);

      if (cancelled) return;
      if (error) {
        console.error('Failed to load activity events:', error.message);
        return;
      }
      setEvents((data ?? []) as unknown as ActivityEvent[]);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const unreadCount = events.filter((e) => e.created_at > lastSeen).length;

  function togglePanel() {
    setOpen((prev) => {
      const next = !prev;
      if (next && events[0]) {
        const newest = events[0].created_at;
        localStorage.setItem(LAST_SEEN_KEY, newest);
        setLastSeen(newest);
      }
      return next;
    });
  }

  function handleEventClick(event: ActivityEvent) {
    setOpen(false);
    navigate(`/counselor/students?student=${event.student_id}`);
  }

  const isSidebar = variant === 'sidebar';

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={togglePanel}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        className={
          isSidebar
            ? 'w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:bg-stone-50 hover:text-slate-700 transition-all duration-150 relative'
            : 'p-2 hover:bg-stone-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors relative'
        }
      >
        {isSidebar ? (
          <>
            <Bell className="w-4.5 h-4.5 flex-shrink-0" />
            <span>Notifications</span>
            {unreadCount > 0 && (
              <span className="ml-auto bg-rose-500 text-white text-[10px] font-semibold rounded-full px-1.5 min-w-[18px] h-[18px] flex items-center justify-center">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </>
        ) : (
          <>
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white" />
            )}
          </>
        )}
      </button>

      {open && (
        <div
          className={
            isSidebar
              ? 'absolute left-full ml-2 bottom-0 w-96 max-w-[calc(100vw-2rem)] bg-white border border-stone-200 rounded-2xl shadow-lg z-30 overflow-hidden'
              : 'absolute right-0 mt-2 w-96 max-w-[calc(100vw-2rem)] bg-white border border-stone-200 rounded-2xl shadow-lg z-30 overflow-hidden'
          }
        >
          <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between bg-stone-50">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-teal-600" />
              <p className="text-sm font-semibold text-slate-700">Activity</p>
              {unreadCount > 0 && (
                <span className="bg-rose-500 text-white text-[10px] font-semibold rounded-full px-1.5 py-0.5">
                  {unreadCount} new
                </span>
              )}
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1 hover:bg-stone-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
              aria-label="Close notifications"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="max-h-[28rem] overflow-y-auto">
            {events.length === 0 ? (
              <div className="p-8 text-center">
                <CheckCheck className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-400 leading-relaxed">
                  No student activity yet. New signups, check-ins, and alerts will appear here.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-stone-100">
                {events.map((event) => {
                  const v = visualFor(event.type);
                  const Icon = v.icon;
                  const isUnread = event.created_at > lastSeen;
                  return (
                    <li key={event.id}>
                      <button
                        type="button"
                        onClick={() => handleEventClick(event)}
                        className={`w-full text-left px-4 py-3 hover:bg-stone-50 transition-colors flex items-start gap-3 ${
                          isUnread ? 'bg-teal-50/30' : ''
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-full ${v.bg} ring-1 ${v.ring} flex items-center justify-center flex-shrink-0`}
                        >
                          <Icon className={`w-4 h-4 ${v.iconColor}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 truncate">
                              {v.label}
                            </span>
                            <span
                              className="text-[11px] text-slate-400 flex-shrink-0"
                              title={formatFullDateTime(event.created_at)}
                            >
                              {formatRelativeTime(event.created_at)}
                            </span>
                          </div>
                          <p className="text-sm text-slate-700 mt-0.5 leading-snug">
                            {describeEvent(event)}
                          </p>
                          <time
                            dateTime={event.created_at}
                            className="text-[11px] text-slate-400 tabular-nums mt-1 block"
                          >
                            {formatFullDateTime(event.created_at)}
                          </time>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { Bell, MessageCircleHeart, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';

interface FollowUpNote {
  id: string;
  note: string;
  created_at: string;
}

interface Props {
  variant?: 'header' | 'sidebar';
}

function formatNoteDate(dateString: string): string {
  const d = new Date(dateString);
  const diffMin = Math.floor((Date.now() - d.getTime()) / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h ago`;
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function lastSeenKey(userId: string): string {
  return `ayo_notifications_last_seen_${userId}`;
}

export function StudentNotifications({ variant = 'header' }: Props) {
  const { user } = useAuth();
  const [notes, setNotes] = useState<FollowUpNote[]>([]);
  const [open, setOpen] = useState(false);
  const [lastSeen, setLastSeen] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    setLastSeen(localStorage.getItem(lastSeenKey(user.id)) ?? '');

    let cancelled = false;
    async function load() {
      const { data, error } = await supabase
        .from('follow_ups')
        .select('id, note, created_at')
        .eq('student_id', user!.id)
        .order('created_at', { ascending: false });

      if (cancelled) return;
      if (error) {
        console.error('Failed to load follow-up notes:', error.message);
        return;
      }
      setNotes(data ?? []);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

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

  const unreadCount = notes.filter((n) => n.created_at > lastSeen).length;

  function togglePanel() {
    setOpen((prev) => {
      const next = !prev;
      if (next && notes[0] && user) {
        const newest = notes[0].created_at;
        localStorage.setItem(lastSeenKey(user.id), newest);
        setLastSeen(newest);
      }
      return next;
    });
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
                {unreadCount}
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
              ? 'absolute left-full ml-2 bottom-0 w-80 max-w-[calc(100vw-2rem)] bg-white border border-stone-200 rounded-2xl shadow-lg z-30 overflow-hidden'
              : 'absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white border border-stone-200 rounded-2xl shadow-lg z-30 overflow-hidden'
          }
        >
          <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between bg-stone-50">
            <div className="flex items-center gap-2">
              <MessageCircleHeart className="w-4 h-4 text-teal-500" />
              <p className="text-sm font-semibold text-slate-700">Notes from your counselor</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1 hover:bg-stone-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
              aria-label="Close notifications"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notes.length === 0 ? (
              <div className="p-6 text-center">
                <MessageCircleHeart className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-400 leading-relaxed">
                  No notes yet. Your counselor will share messages here when they have something for you.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-stone-100">
                {notes.map((n) => (
                  <li key={n.id} className="px-4 py-3">
                    <p className="text-[11px] text-slate-400 mb-1">{formatNoteDate(n.created_at)}</p>
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap break-words">
                      {n.note}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

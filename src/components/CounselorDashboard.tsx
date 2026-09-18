import { allPages } from '../lib/records';
import { reviewIsCurrent, type PriorityReview } from '../lib/priority';
import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, LogOut, Heart, ClipboardList, MessageSquareHeart, FileBarChart, MessageCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { daysSince } from '../lib/dates';
import { SCALE_POINTS, type MoodKey } from '../lib/mood';
import { CounselorNotifications } from './CounselorNotifications';

type TabType = 'overview' | 'students' | 'questions' | 'reflections' | 'messages' | 'reports';

export interface CheckInAnswer {
  questionId: string;
  question: string;
  answer: string;
  points?: number;
  kind?: 'scale' | 'reflection';
}

export interface CounselorCheckIn {
  date: string;
  answers: CheckInAnswer[];
  mood: MoodKey | null;
  score: number | null;
  maxScore: number | null;
}

export interface CounselorStudent {
  id: string;
  name: string;
  lastCheckIn: string;
  alertLevel: 'none' | 'medium' | 'high';
  recentConcerns: string[];
  concernCount: number;
  checkIns: CounselorCheckIn[];
  prioritySource: string;
}

export interface CounselorOutletContext {
  students: CounselorStudent[];
  refreshStudents: () => void;
}

const tabToPath: Record<TabType, string> = {
  reports: '/counselor/reports',
  messages: '/counselor/messages',
  overview: '/counselor/overview',
  students: '/counselor/students',
  questions: '/counselor/questions',
  reflections: '/counselor/reflections',
};

function getActiveTab(pathname: string): TabType {
  if (pathname.includes('/messages')) return 'messages';
  if (pathname.includes('/reports')) return 'reports';
  if (pathname.includes('/students')) return 'students';
  if (pathname.includes('/reflections')) return 'reflections';
  if (pathname.includes('/questions')) return 'questions';
  return 'overview';
}

function deriveAlertLevel(
  latest: CounselorCheckIn | undefined,
  inactiveDays: number
): CounselorStudent['alertLevel'] {
  if (inactiveDays > 7) return 'high';
  if (latest?.mood === 'struggling') return 'high';
  if (latest?.mood === 'okay' || inactiveDays > 3) return 'medium';
  return 'none';
}

export function CounselorDashboard() {
  const { user, profile, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const activeTab = getActiveTab(location.pathname);

  const [students, setStudents] = useState<CounselorStudent[]>([]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || profile?.role !== 'counselor') {
      navigate('/', { replace: true });
      return;
    }
    loadStudents();
  }, [user, profile, authLoading]);

  async function loadStudents() {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        id,
        name,
        check_ins (
          id,
          answers,
          created_at,
          score,
          max_score,
          mood
        )
      `)
      .eq('role', 'student')
      .order('created_at', { referencedTable: 'check_ins', ascending: false });

    if (error) {
      console.error('Failed to load students:', error.message);
      return;
    }

    let reviews: PriorityReview[] = [];
    let reviewsUnavailable = false;
    try {
      reviews = await allPages<PriorityReview>((from, to) => supabase.from('priority_reviews').select('*').order('created_at', { ascending: false }).order('id', { ascending: false }).range(from, to));
    } catch {
      // Existing provisional indicators remain visible if review storage is unavailable.
      reviewsUnavailable = true;
      console.error('Could not load counselor reviews. Showing provisional indicators.');
    }
    const mapped: CounselorStudent[] = (data ?? []).map((student) => {
      const checkIns: CounselorCheckIn[] = (student.check_ins ?? []).map((c: {
        answers: CheckInAnswer[]; created_at: string; score: number | null;
        max_score: number | null; mood: MoodKey | null;
      }) => ({
        date: c.created_at,
        answers: c.answers ?? [],
        mood: c.mood ?? null,
        score: c.score ?? null,
        maxScore: c.max_score ?? null,
      }));

      const lastCheckIn = checkIns[0]?.date ?? '';
      const inactiveDays = lastCheckIn ? daysSince(lastCheckIn) : 999;

      // Low-scoring statements (Rarely / Never) are the student's recent concerns.
      const latestAnswers = checkIns[0]?.answers ?? [];
      const lowAnswers = latestAnswers.filter(
        (a) => a.answer in SCALE_POINTS && SCALE_POINTS[a.answer] <= 2
      );
      const recentConcerns = lowAnswers.map((a) => a.question);
      const concernCount = lowAnswers.length;

      const review = reviews.find((item) => item.student_id === student.id);
      const currentReview = reviewIsCurrent(review, lastCheckIn);
      const reviewedLevel = review?.priority === 'urgent' ? 'high' : review?.priority === 'follow_up' ? 'medium' : 'none';
      return {
        id: student.id,
        name: student.name,
        lastCheckIn,
        alertLevel: currentReview ? reviewedLevel : deriveAlertLevel(checkIns[0], inactiveDays),
        prioritySource: reviewsUnavailable ? 'Reviews unavailable · provisional indicator' : currentReview ? 'Counselor reviewed' : review ? 'New check-in needs review' : 'Provisional · needs counselor review',
        recentConcerns,
        concernCount,
        checkIns,
      };
    });

    setStudents(mapped);
  }

  async function handleLogout() {
    await signOut();
    navigate('/', { replace: true });
  }

  const navItems = [
    { id: 'overview' as TabType, label: 'Overview', icon: LayoutDashboard },
    { id: 'students' as TabType, label: 'Students', icon: Users },
    { id: 'reports' as TabType, label: 'Reports', icon: FileBarChart },
    { id: 'messages' as TabType, label: 'Messages', icon: MessageCircle },
    { id: 'questions' as TabType, label: 'Questions', icon: ClipboardList },
    { id: 'reflections' as TabType, label: 'Reflections', icon: MessageSquareHeart },
  ];

  const outletContext: CounselorOutletContext = { students, refreshStudents: loadStudents };

  if (authLoading || !user || profile?.role !== 'counselor') return null;

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Mobile header */}
      <header className="lg:hidden bg-white/70 backdrop-blur-md border-b border-stone-100/60 px-4 py-3.5 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-full flex items-center justify-center shadow-sm">
              <Heart className="w-4 h-4 text-white" fill="currentColor" />
            </div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-semibold text-slate-800 tracking-tight">Ayo</h1>
              <span className="text-xs text-teal-700 bg-teal-50 border border-teal-100/60 px-2 py-0.5 rounded-full font-medium">Counselor</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <CounselorNotifications variant="header" />
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-stone-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
              aria-label="Log out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-white/70 backdrop-blur-md border-r border-stone-100/60">
          <div className="flex items-center space-x-3 px-6 py-6 border-b border-stone-100/60">
            <div className="w-9 h-9 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-full flex items-center justify-center shadow-sm">
              <Heart className="w-5 h-5 text-white" fill="currentColor" />
            </div>
            <div>
              <span className="text-lg font-semibold text-slate-800 tracking-tight">Ayo</span>
              <p className="text-xs text-slate-400 leading-tight">Counselor Portal</p>
            </div>
          </div>

          <nav className="flex-1 px-3 py-5 space-y-0.5">
            {navItems.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => navigate(tabToPath[id])}
                className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  activeTab === id
                    ? 'bg-teal-50 text-teal-700'
                    : 'text-slate-500 hover:bg-stone-50 hover:text-slate-700'
                }`}
              >
                <Icon className={`w-4.5 h-4.5 flex-shrink-0 ${activeTab === id ? 'text-teal-600' : ''}`} />
                <span>{label}</span>
              </button>
            ))}
          </nav>

          <div className="px-3 py-5 border-t border-stone-100/60 space-y-0.5">
            <CounselorNotifications variant="sidebar" />
            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:bg-stone-50 hover:text-slate-600 transition-all duration-150"
            >
              <LogOut className="w-4.5 h-4.5 flex-shrink-0" />
              <span>Log Out</span>
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 lg:ml-64 pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-0 min-h-screen">
          <Outlet context={outletContext} />
        </main>
      </div>

      {/* Mobile bottom nav — stuck to bottom */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-10">
        <div className="bg-white/95 backdrop-blur-lg border-t border-stone-200/80 px-2 py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]">
          <div className="flex overflow-x-auto items-center">
            {navItems.map(({ id, label, icon: Icon }) => {
              const isActive = activeTab === id;
              return (
                <button
                  key={id}
                  onClick={() => navigate(tabToPath[id])}
                  aria-label={label}
                  className={`relative flex-1 min-w-[64px] flex flex-col items-center py-2 px-1 rounded-2xl transition-all duration-200 ${
                    isActive
                      ? 'text-teal-700 bg-teal-50'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'scale-110' : ''} transition-transform`} />
                  <span className="text-[10px] mt-0.5 font-medium">{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}

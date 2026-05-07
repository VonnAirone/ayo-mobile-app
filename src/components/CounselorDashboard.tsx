import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, LogOut, Heart, ClipboardList } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { daysSince } from '../lib/dates';

type TabType = 'overview' | 'students' | 'questions';

export interface CheckInAnswer {
  questionId: string;
  question: string;
  answer: string;
}

export interface CounselorStudent {
  id: string;
  name: string;
  lastCheckIn: string;
  alertLevel: 'none' | 'medium' | 'high';
  recentConcerns: string[];
  concernCount: number;
  checkIns: {
    date: string;
    answers: CheckInAnswer[];
  }[];
}

export interface CounselorOutletContext {
  students: CounselorStudent[];
  refreshStudents: () => void;
}

const tabToPath: Record<TabType, string> = {
  overview: '/counselor/overview',
  students: '/counselor/students',
  questions: '/counselor/questions',
};

function getActiveTab(pathname: string): TabType {
  if (pathname.includes('/students')) return 'students';
  if (pathname.includes('/questions')) return 'questions';
  return 'overview';
}

// 0 = fine, 1 = medium concern, 2 = high concern
const MOOD_SCORE: Record<string, number> = {
  '😊 Great': 0,
  '🙂 Good': 0,
  '😐 Okay': 0,
  '😔 Low': 1,
  '😞 Really struggling': 2,
};

const CONFIDENCE_SCORE: Record<string, number> = {
  'Handling it well': 0,
  'Managing okay': 0,
  'Struggling a bit': 1,
  'Feeling overwhelmed': 2,
};

function deriveAlertLevel(
  latestAnswers: CheckInAnswer[],
  inactiveDays: number
): CounselorStudent['alertLevel'] {
  if (inactiveDays > 7) return 'high';

  const moodAnswer = latestAnswers.find((a) => a.questionId === 'mood')?.answer ?? '';
  const confidenceAnswer = latestAnswers.find((a) => a.questionId === 'confidence')?.answer ?? '';

  const score = Math.max(
    MOOD_SCORE[moodAnswer] ?? 0,
    CONFIDENCE_SCORE[confidenceAnswer] ?? 0
  );

  if (score === 2) return 'high';
  if (score === 1 || inactiveDays > 3) return 'medium';
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
          created_at
        )
      `)
      .eq('role', 'student')
      .order('created_at', { referencedTable: 'check_ins', ascending: false });

    if (error) {
      console.error('Failed to load students:', error.message);
      return;
    }

    const mapped: CounselorStudent[] = (data ?? []).map((student) => {
      const checkIns = (student.check_ins ?? []).map((c: {
        answers: CheckInAnswer[]; created_at: string;
      }) => ({
        date: c.created_at,
        answers: c.answers ?? [],
      }));

      const lastCheckIn = checkIns[0]?.date ?? '';
      const inactiveDays = lastCheckIn ? daysSince(lastCheckIn) : 999;

      const latestAnswers = checkIns[0]?.answers ?? [];
      const stressAnswer = latestAnswers.find((a) => a.questionId === 'stress')?.answer ?? '';
      const recentConcerns = stressAnswer
        ? stressAnswer.split(', ').filter((s) => s !== 'Nothing right now')
        : [];

      const concernCount = latestAnswers.filter((a) => a.answer === 'Yes').length;

      return {
        id: student.id,
        name: student.name,
        lastCheckIn,
        alertLevel: deriveAlertLevel(latestAnswers, inactiveDays),
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
    { id: 'questions' as TabType, label: 'Questions', icon: ClipboardList },
  ];

  const outletContext: CounselorOutletContext = { students, refreshStudents: loadStudents };

  if (authLoading) return null;

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Mobile header */}
      <header className="lg:hidden bg-white border-b border-stone-100 px-4 py-3.5 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 bg-teal-500 rounded-full flex items-center justify-center">
              <Heart className="w-4 h-4 text-white" fill="currentColor" />
            </div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-semibold text-slate-800 tracking-tight">Ayo</h1>
              <span className="text-xs text-slate-400 bg-stone-100 px-2 py-0.5 rounded-full">Counselor</span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 hover:bg-stone-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="Log out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-white border-r border-stone-100">
          <div className="flex items-center space-x-3 px-6 py-6 border-b border-stone-100">
            <div className="w-9 h-9 bg-teal-500 rounded-full flex items-center justify-center shadow-sm">
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

          <div className="px-3 py-5 border-t border-stone-100">
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
        <main className="flex-1 lg:ml-64 pb-20 lg:pb-0 min-h-screen">
          <Outlet context={outletContext} />
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-stone-100 z-10">
        <div className="flex justify-around">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => navigate(tabToPath[id])}
              className={`flex-1 flex flex-col items-center py-3 transition-colors ${
                activeTab === id ? 'text-teal-600' : 'text-slate-400'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs mt-1 font-medium">{label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

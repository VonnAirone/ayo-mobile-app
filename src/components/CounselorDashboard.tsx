import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, LogOut, Heart } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';

type TabType = 'overview' | 'students';

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
  checkIns: {
    date: string;
    answers: CheckInAnswer[];
  }[];
}

export interface CounselorOutletContext {
  students: CounselorStudent[];
}

const tabToPath: Record<TabType, string> = {
  overview: '/counselor/overview',
  students: '/counselor/students',
};

function getActiveTab(pathname: string): TabType {
  if (pathname.includes('/students')) return 'students';
  return 'overview';
}

function deriveAlertLevel(
  latestAnswers: CheckInAnswer[],
  daysSince: number
): CounselorStudent['alertLevel'] {
  if (daysSince > 7) return 'high';

  const mood = latestAnswers.find((a) => a.questionId === 'mood')?.answer ?? '';
  const confidence = latestAnswers.find((a) => a.questionId === 'confidence')?.answer ?? '';

  if (mood.includes('Really struggling') || confidence.includes('overwhelmed')) return 'high';
  if (mood.includes('Low') || confidence.includes('Struggling')) return 'medium';
  if (daysSince > 3) return 'medium';
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
    // Fetch all student profiles with their check-ins
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
      const daysSince = lastCheckIn
        ? Math.floor((Date.now() - new Date(lastCheckIn).getTime()) / (1000 * 60 * 60 * 24))
        : 999;

      const latestAnswers = checkIns[0]?.answers ?? [];
      const stressAnswer = latestAnswers.find((a) => a.questionId === 'stress')?.answer ?? '';
      const recentConcerns = stressAnswer
        ? stressAnswer.split(', ').filter((s) => s !== 'Nothing right now')
        : [];

      return {
        id: student.id,
        name: student.name,
        lastCheckIn,
        alertLevel: deriveAlertLevel(latestAnswers, daysSince),
        recentConcerns,
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
  ];

  const outletContext: CounselorOutletContext = { students };

  if (authLoading) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile header */}
      <header className="lg:hidden bg-blue-600 text-white p-4 sticky top-0 z-10 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Heart className="w-6 h-6" fill="currentColor" />
            <h1 className="text-xl font-semibold">Ayo</h1>
            <span className="text-blue-200 text-sm">Counselor</span>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 hover:bg-blue-700 rounded-full transition-colors"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-white border-r border-gray-200 shadow-sm">
          <div className="flex items-center space-x-3 px-6 py-5 border-b border-gray-100">
            <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center">
              <Heart className="w-5 h-5 text-white" fill="currentColor" />
            </div>
            <div>
              <span className="text-lg font-semibold text-gray-900">Ayo</span>
              <p className="text-xs text-gray-500 leading-none">Counselor Portal</p>
            </div>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-1">
            {navItems.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => navigate(tabToPath[id])}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === id
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span>{label}</span>
              </button>
            ))}
          </nav>

          <div className="px-4 py-5 border-t border-gray-100">
            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
            >
              <LogOut className="w-5 h-5 flex-shrink-0" />
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
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-10">
        <div className="flex justify-around">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => navigate(tabToPath[id])}
              className={`flex-1 flex flex-col items-center py-3 transition-colors ${
                activeTab === id ? 'text-blue-600' : 'text-gray-500'
              }`}
            >
              <Icon className="w-6 h-6" />
              <span className="text-xs mt-1">{label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

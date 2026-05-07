import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Home, Calendar, BookOpen, User, LogOut, Heart, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { hasCheckedInToday } from '../lib/streak';

type TabType = 'home' | 'checkin' | 'history' | 'resources';

export interface CheckInAnswer {
  questionId: string;
  question: string;
  answer: string;
}

export interface CheckIn {
  id: string;
  date: string;
  answers: CheckInAnswer[];
}

export interface CheckInData {
  answers: CheckInAnswer[];
}

export interface StudentOutletContext {
  checkIns: CheckIn[];
  handleCheckInSubmit: (data: CheckInData) => void;
}

const tabToPath: Record<TabType, string> = {
  home: '/student/home',
  checkin: '/student/checkin',
  history: '/student/history',
  resources: '/student/resources',
};

function getActiveTab(pathname: string): TabType {
  if (pathname.includes('/checkin')) return 'checkin';
  if (pathname.includes('/history')) return 'history';
  if (pathname.includes('/resources')) return 'resources';
  return 'home';
}

export function StudentDashboard() {
  const { user, profile, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const activeTab = getActiveTab(location.pathname);

  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || profile?.role !== 'student') {
      navigate('/', { replace: true });
      return;
    }
    loadCheckIns();
  }, [user, profile, authLoading]);

  async function loadCheckIns() {
    const { data, error } = await supabase
      .from('check_ins')
      .select('id, answers, created_at')
      .eq('student_id', user!.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to load check-ins:', error.message);
      return;
    }

    setCheckIns(
      (data ?? []).map((row) => ({
        id: row.id,
        date: row.created_at,
        answers: row.answers ?? [],
      }))
    );
  }

  async function handleCheckInSubmit(data: CheckInData) {
    const { error } = await supabase.from('check_ins').insert({
      student_id: user!.id,
      answers: data.answers,
    });

    if (error) {
      console.error('Failed to save check-in:', error.message);
      return;
    }

    await loadCheckIns();
    navigate('/student/home');
  }

  async function handleLogout() {
    await signOut();
    navigate('/', { replace: true });
  }

  const checkedInToday = hasCheckedInToday(checkIns);

  const navItems = [
    { id: 'home' as TabType, label: 'Home', icon: Home },
    { id: 'checkin' as TabType, label: 'Check-In', icon: checkedInToday ? CheckCircle2 : Calendar, disabled: checkedInToday },
    { id: 'history' as TabType, label: 'History', icon: User },
    { id: 'resources' as TabType, label: 'Resources', icon: BookOpen },
  ];

  const outletContext: StudentOutletContext = {
    checkIns,
    handleCheckInSubmit,
  };

  if (authLoading) return null;

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Mobile header — hidden on questionnaire so Yes/No buttons fit without scrolling */}
      {activeTab !== 'checkin' && (
        <header className="lg:hidden bg-white border-b border-stone-100 px-4 py-3.5 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 bg-teal-500 rounded-full flex items-center justify-center">
                <Heart className="w-4 h-4 text-white" fill="currentColor" />
              </div>
              <h1 className="text-lg font-semibold text-slate-800 tracking-tight">Ayo</h1>
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
      )}

      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-white border-r border-stone-100">
          <div className="flex items-center space-x-3 px-6 py-6 border-b border-stone-100">
            <div className="w-9 h-9 bg-teal-500 rounded-full flex items-center justify-center shadow-sm">
              <Heart className="w-5 h-5 text-white" fill="currentColor" />
            </div>
            <div>
              <span className="text-lg font-semibold text-slate-800 tracking-tight">Ayo</span>
              {profile?.name && (
                <p className="text-xs text-slate-400 truncate leading-tight">{profile.name}</p>
              )}
            </div>
          </div>

          <nav className="flex-1 px-3 py-5 space-y-0.5">
            {navItems.map(({ id, label, icon: Icon, disabled }) => (
              <button
                key={id}
                onClick={() => !disabled && navigate(tabToPath[id])}
                disabled={disabled}
                className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  disabled
                    ? 'text-slate-300 cursor-not-allowed'
                    : activeTab === id
                    ? 'bg-teal-50 text-teal-700'
                    : 'text-slate-500 hover:bg-stone-50 hover:text-slate-700'
                }`}
              >
                <Icon className={`w-4.5 h-4.5 flex-shrink-0 ${activeTab === id ? 'text-teal-600' : ''}`} />
                <span>{label}</span>
                {disabled && <span className="ml-auto text-xs text-slate-300">Done ✓</span>}
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
        <main className={`flex-1 lg:ml-64 min-h-screen ${activeTab !== 'checkin' ? 'pb-20 lg:pb-0' : ''}`}>
          <Outlet context={outletContext} />
        </main>
      </div>

      {/* Mobile bottom nav — hidden on questionnaire to free space for Yes/No buttons */}
      {activeTab !== 'checkin' && (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-stone-100 z-10">
          <div className="flex justify-around">
            {navItems.map(({ id, label, icon: Icon, disabled }) => (
              <button
                key={id}
                onClick={() => !disabled && navigate(tabToPath[id])}
                disabled={disabled}
                className={`flex-1 flex flex-col items-center py-3 transition-colors ${
                  disabled
                    ? 'text-slate-300 cursor-not-allowed'
                    : activeTab === id
                    ? 'text-teal-600'
                    : 'text-slate-400'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs mt-1 font-medium">{label}</span>
                {activeTab === id && (
                  <span className="absolute top-0 w-6 h-0.5 bg-teal-500 rounded-full -mt-px" />
                )}
              </button>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}

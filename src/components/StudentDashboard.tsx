import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Home, Calendar, BookOpen, User, LogOut, Heart } from 'lucide-react';

type TabType = 'home' | 'checkin' | 'history' | 'resources';

export interface StudentOutletContext {
  checkIns: CheckIn[];
  handleCheckInSubmit: (data: CheckInData) => void;
}

export interface CheckIn {
  id: string;
  date: string;
  mood: number;
  stress: number;
  sleep: number;
  concerns?: string[];
  notes: string;
}

export interface CheckInData {
  mood: number;
  stress: number;
  sleep: number;
  concerns: string[];
  notes: string;
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
  const navigate = useNavigate();
  const location = useLocation();
  const activeTab = getActiveTab(location.pathname);

  const [checkIns, setCheckIns] = useState<CheckIn[]>([
    {
      id: '1',
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      mood: 7,
      stress: 4,
      sleep: 6,
      notes: 'Feeling good overall',
    },
    {
      id: '2',
      date: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
      mood: 5,
      stress: 7,
      sleep: 4,
      notes: 'Midterms are stressful',
    },
  ]);

  const handleCheckInSubmit = (data: CheckInData) => {
    const newCheckIn: CheckIn = {
      id: String(checkIns.length + 1),
      date: new Date().toISOString(),
      ...data,
    };
    setCheckIns([newCheckIn, ...checkIns]);
    navigate('/student/home');
  };

  const handleLogout = () => {
    navigate('/');
  };

  const navItems = [
    { id: 'home' as TabType, label: 'Home', icon: Home },
    { id: 'checkin' as TabType, label: 'Check-In', icon: Calendar },
    { id: 'history' as TabType, label: 'History', icon: User },
    { id: 'resources' as TabType, label: 'Resources', icon: BookOpen },
  ];

  const outletContext: StudentOutletContext = {
    checkIns,
    handleCheckInSubmit,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile header */}
      <header className="lg:hidden bg-blue-600 text-white p-4 sticky top-0 z-10 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Heart className="w-6 h-6" fill="currentColor" />
            <h1 className="text-xl font-semibold">Ayo</h1>
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
            <span className="text-xl font-semibold text-gray-900">Ayo</span>
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

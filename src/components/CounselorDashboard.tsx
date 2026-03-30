import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, LogOut, Heart } from 'lucide-react';

type TabType = 'overview' | 'students';

export interface CounselorStudent {
  id: string;
  name: string;
  lastCheckIn: string;
  averageMood: number;
  alertLevel: 'none' | 'medium' | 'high';
  recentConcerns: string[];
  checkIns: {
    date: string;
    mood: number;
    stress: number;
    sleep: number;
    concerns: string[];
    notes: string;
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

const students: CounselorStudent[] = [
  {
    id: '1',
    name: 'Sarah Johnson',
    lastCheckIn: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    averageMood: 6.8,
    alertLevel: 'none',
    recentConcerns: ['Academic pressure'],
    checkIns: [
      {
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        mood: 7,
        stress: 5,
        sleep: 7,
        concerns: ['Academic pressure'],
        notes: 'Finals coming up but managing well',
      },
      {
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        mood: 6,
        stress: 6,
        sleep: 6,
        concerns: ['Academic pressure', 'Future/career anxiety'],
        notes: 'Thinking about college applications',
      },
    ],
  },
  {
    id: '2',
    name: 'Michael Chen',
    lastCheckIn: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    averageMood: 3.5,
    alertLevel: 'high',
    recentConcerns: ['Loneliness', 'Social relationships'],
    checkIns: [
      {
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        mood: 3,
        stress: 8,
        sleep: 4,
        concerns: ['Loneliness', 'Social relationships'],
        notes: 'Finding it hard to connect with others',
      },
      {
        date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        mood: 4,
        stress: 7,
        sleep: 5,
        concerns: ['Social relationships'],
        notes: 'Feeling isolated',
      },
    ],
  },
  {
    id: '3',
    name: 'Emily Rodriguez',
    lastCheckIn: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    averageMood: 5.2,
    alertLevel: 'medium',
    recentConcerns: ['Family issues', 'Financial stress'],
    checkIns: [
      {
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        mood: 5,
        stress: 7,
        sleep: 5,
        concerns: ['Family issues', 'Financial stress'],
        notes: 'Things are tough at home',
      },
    ],
  },
  {
    id: '4',
    name: 'David Kim',
    lastCheckIn: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    averageMood: 8.2,
    alertLevel: 'none',
    recentConcerns: [],
    checkIns: [
      {
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        mood: 8,
        stress: 3,
        sleep: 8,
        concerns: [],
        notes: 'Doing great!',
      },
    ],
  },
  {
    id: '5',
    name: 'Jessica Brown',
    lastCheckIn: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    averageMood: 6.0,
    alertLevel: 'medium',
    recentConcerns: ['Academic pressure'],
    checkIns: [
      {
        date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        mood: 6,
        stress: 6,
        sleep: 6,
        concerns: ['Academic pressure'],
        notes: '',
      },
    ],
  },
];

export function CounselorDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const activeTab = getActiveTab(location.pathname);

  const handleLogout = () => {
    navigate('/');
  };

  const navItems = [
    { id: 'overview' as TabType, label: 'Overview', icon: LayoutDashboard },
    { id: 'students' as TabType, label: 'Students', icon: Users },
  ];

  const outletContext: CounselorOutletContext = { students };

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

import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AuthPage } from './components/AuthPage';
import { StudentDashboard } from './components/StudentDashboard';
import { StudentHome } from './components/StudentHome';
import { CheckInQuestionnaire } from './components/CheckInQuestionnaire';
import { CheckInHistory } from './components/CheckInHistory';
import { Resources } from './components/Resources';
import { CounselorDashboard } from './components/CounselorDashboard';
import { CounselorOverview } from './components/CounselorOverview';
import { StudentList } from './components/StudentList';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AuthPage />,
  },
  {
    path: '/student',
    element: <StudentDashboard />,
    children: [
      { index: true, element: <Navigate to="home" replace /> },
      { path: 'home', element: <StudentHome /> },
      { path: 'checkin', element: <CheckInQuestionnaire /> },
      { path: 'history', element: <CheckInHistory /> },
      { path: 'resources', element: <Resources /> },
    ],
  },
  {
    path: '/counselor',
    element: <CounselorDashboard />,
    children: [
      { index: true, element: <Navigate to="overview" replace /> },
      { path: 'overview', element: <CounselorOverview /> },
      { path: 'students', element: <StudentList /> },
    ],
  },
]);

import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { AuthProvider } from './lib/AuthContext';
import { ScreenProtection } from './components/ScreenProtection';

export function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
      <ScreenProtection />
    </AuthProvider>
  );
}

import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { AuthProvider } from './lib/AuthContext';

export function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}

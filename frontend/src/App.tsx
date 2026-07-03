import { Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { Cursor } from './components/Cursor';
import { Navbar } from './components/Navbar';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthProvider } from './lib/auth';
import { RestaurantProvider } from './lib/restaurant';
import { ToastProvider } from './lib/toast';
import { useLenis } from './hooks/useLenis';
import { Landing } from './pages/Landing';
import { Auth } from './pages/Auth';
import { Dashboard } from './pages/Dashboard';
import { Admin } from './pages/Admin';
import { NotFound } from './pages/NotFound';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    // On route change, jump to the top. We use a plain assignment; if Lenis
    // is active, calling window.scrollTo is what it expects for sync.
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [pathname]);
  return null;
}

export default function App() {
  useLenis();
  return (
    <AuthProvider>
      <RestaurantProvider>
        <ToastProvider>
          <Cursor />
          <Navbar />
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute role="admin">
                  <Admin />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </ToastProvider>
      </RestaurantProvider>
    </AuthProvider>
  );
}

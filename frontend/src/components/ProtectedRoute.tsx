import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import type { Role } from '../lib/types';
import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  role?: Role;
}

export function ProtectedRoute({ children, role }: Props) {
  const { user, token } = useAuth();
  const location = useLocation();

  if (!token || !user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }
  if (role && user.role !== role) {
    // Authenticated but wrong role — bounce to their home, not to login.
    return <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace />;
  }
  return <>{children}</>;
}

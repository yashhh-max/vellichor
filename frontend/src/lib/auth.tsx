import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api, toApiError, type ApiError } from '../lib/api';
import type { AuthResponse, User } from '../lib/types';

interface AuthState {
  user: User | null;
  token: string | null;
  initializing: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

const TOKEN_KEY = 'token';
const USER_KEY = 'user';

function readStored(): { token: string | null; user: User | null } {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const userRaw = localStorage.getItem(USER_KEY);
    const user = userRaw ? (JSON.parse(userRaw) as User) : null;
    return { token, user };
  } catch {
    return { token: null, user: null };
  }
}

function writeStored(token: string | null, user: User | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  else localStorage.removeItem(USER_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [{ token, user }, setState] = useState(readStored);
  const [initializing] = useState(false);

  // Verify the stored token on first mount by calling /api/auth/me.
  // If the token is bad, clear it. This makes the refresh-page experience
  // honest — we never trust a stale token.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token) return;
      try {
        const res = await api.get<{ user: User }>('/auth/me');
        if (!cancelled) {
          // Refresh user in case role/name changed server-side.
          writeStored(token, res.data.user);
          setState({ token, user: res.data.user });
        }
      } catch {
        if (!cancelled) {
          writeStored(null, null);
          setState({ token: null, user: null });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAuth = useCallback((res: AuthResponse) => {
    writeStored(res.token, res.user);
    setState({ token: res.token, user: res.user });
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      try {
        const res = await api.post<AuthResponse>('/auth/login', { email, password });
        handleAuth(res.data);
      } catch (err) {
        throw toApiError(err) as ApiError;
      }
    },
    [handleAuth]
  );

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      try {
        const res = await api.post<AuthResponse>('/auth/register', { name, email, password });
        handleAuth(res.data);
      } catch (err) {
        throw toApiError(err) as ApiError;
      }
    },
    [handleAuth]
  );

  const logout = useCallback(() => {
    writeStored(null, null);
    setState({ token: null, user: null });
  }, []);

  const value = useMemo<AuthState>(
    () => ({ user, token, initializing, login, register, logout }),
    [user, token, initializing, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

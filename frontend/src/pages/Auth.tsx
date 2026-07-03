import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../lib/auth';
import { usePageMeta } from '../hooks/usePageMeta';
import { useRestaurant } from '../lib/restaurant';

type Mode = 'login' | 'register';

export function Auth() {
  const { name: restaurantName } = useRestaurant();
  usePageMeta(`Sign in · ${restaurantName}`);
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register } = useAuth();

  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fromState = (location.state as { from?: { pathname: string } } | null) || null;
  const from = fromState?.from?.pathname;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(name, email, password);
      }
      // AuthProvider has updated state; navigate after a tick to let it settle.
      setTimeout(() => {
        // Server will put us in the right place based on role; we go to
        // /dashboard for customers, /admin for admins. We don't know role
        // here synchronously, so we read from localStorage as a fallback.
        const u = JSON.parse(localStorage.getItem('user') || 'null');
        if (from) navigate(from, { replace: true });
        else if (u?.role === 'admin') navigate('/admin', { replace: true });
        else navigate('/dashboard', { replace: true });
      }, 0);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="relative min-h-screen w-full grain grain-soft">
      <div className="absolute inset-0 -z-10 bg-ink-900"
        style={{
          backgroundImage:
            'radial-gradient(50% 50% at 30% 30%, rgba(62,167,255,0.08), transparent 60%)',
        }}
      />
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-24">
        <Link to="/" data-cursor-hover className="mb-10 text-sm text-bone-300 hover:text-bone-50 transition-colors">
          ← Back
        </Link>

        <div className="rounded-2xl border border-bone-200/10 bg-ink-800 p-8 backdrop-blur-md shadow-2xl shadow-black/40">
          <div className="flex items-center justify-between">
            <h1 className="font-display text-2xl tracking-tightest font-semibold">
              {mode === 'login' ? 'Welcome back' : 'Create an account'}
            </h1>
            <button
              type="button"
              data-cursor-hover
              onClick={() => {
                setMode((m) => (m === 'login' ? 'register' : 'login'));
                setError(null);
              }}
              className="text-xs text-bone-300 hover:text-gold-300 transition-colors"
            >
              {mode === 'login' ? 'New here? Register' : 'Have an account? Sign in'}
            </button>
          </div>

          <AnimatePresence mode="wait">
            <motion.form
              key={mode}
              onSubmit={onSubmit}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="mt-8 space-y-5"
            >
              {mode === 'register' && (
                <Field
                  label="Name"
                  type="text"
                  value={name}
                  onChange={setName}
                  placeholder="Your name"
                  autoComplete="name"
                />
              )}
              <Field
                label="Email"
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="you@vellichor.com"
                autoComplete="email"
              />
              <Field
                label="Password"
                type="password"
                value={password}
                onChange={setPassword}
                placeholder={mode === 'register' ? 'At least 6 characters' : ''}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />

              {error && (
                <motion.p
                  initial={{ opacity: 0, x: 0 }}
                  animate={{ opacity: 1, x: [0, -6, 6, -4, 4, 0] }}
                  transition={{ duration: 0.4 }}
                  role="alert"
                  className="rounded-md border border-warn-500/40 bg-warn-500/10 px-3 py-2 text-sm text-warn-500"
                >
                  {error}
                </motion.p>
              )}

              <button
                type="submit"
                data-cursor-hover
                disabled={submitting}
                className="btn-primary w-full"
              >
                {submitting ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
              </button>
            </motion.form>
          </AnimatePresence>

          <p className="mt-6 text-center text-xs text-bone-400">
            Try the seeded admin: <code className="text-bone-200">admin@example.com</code> / <code className="text-bone-200">admin123</code>
          </p>
        </div>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  ...rest
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      <input
        {...rest}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="field-input mt-2"
      />
    </label>
  );
}

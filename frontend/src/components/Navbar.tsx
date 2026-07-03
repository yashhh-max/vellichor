import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useRestaurant } from '../lib/restaurant';

export function Navbar() {
  const { user, logout } = useAuth();
  const { name } = useRestaurant();
  const location = useLocation();
  const navigate = useNavigate();
  const [hidden, setHidden] = useState(false);
  const [lastY, setLastY] = useState(0);

  // Subtle hide/show on scroll-down/up.
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const delta = y - lastY;
      if (y > 80 && delta > 4) setHidden(true);
      else if (delta < -4 || y < 40) setHidden(false);
      setLastY(y);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [lastY]);

  const isLanding = location.pathname === '/';
  const navClass =
    'fixed left-0 right-0 top-0 z-40 transition-transform duration-500 ease-out-expo ' +
    (hidden ? '-translate-y-full' : 'translate-y-0');

  return (
    <nav
      className={
        navClass +
        (isLanding
          ? ' backdrop-blur-md bg-ink-900/40 border-b border-bone-200/5'
          : ' backdrop-blur-md bg-ink-900/60 border-b border-bone-200/5')
      }
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link
          to="/"
          data-cursor-hover
          className="font-display text-lg tracking-tightest font-semibold"
        >
          {name}<span className="text-gold-400">.</span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          {!user && isLanding && (
            <Link to="/auth" data-cursor-hover className="btn-ghost px-4 py-2 text-xs">
              Sign in
            </Link>
          )}
          {user && (
            <>
              <Link
                to={user.role === 'admin' ? '/admin' : '/dashboard'}
                data-cursor-hover
                className="btn-ghost px-4 py-2 text-xs"
              >
                {user.role === 'admin' ? 'Admin' : 'Dashboard'}
              </Link>
              <span className="hidden sm:inline-flex items-center gap-2 text-xs text-bone-300">
                <span className="h-1.5 w-1.5 rounded-full bg-gold-400" />
                {user.name}
              </span>
              <button
                type="button"
                data-cursor-hover
                onClick={() => {
                  logout();
                  navigate('/');
                }}
                className="rounded-full border border-bone-200/20 px-4 py-2 text-xs hover:bg-bone-50/5 transition-colors"
              >
                Sign out
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <main className="relative min-h-screen w-full flex items-center justify-center px-6">
      <div className="text-center">
        <p className="field-label text-bone-300">404</p>
        <h1 className="mt-3 font-display text-5xl tracking-tightest font-semibold">
          Wrong table.
        </h1>
        <p className="mt-4 text-bone-300">The page you were looking for isn’t here.</p>
        <Link to="/" data-cursor-hover className="btn-primary mt-8">
          Back to home
        </Link>
      </div>
    </main>
  );
}

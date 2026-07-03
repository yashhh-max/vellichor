import { Link } from 'react-router-dom';
import { Hero } from '../components/Hero';
import { HowItWorks } from '../components/HowItWorks';
import { DishShowcase } from '../components/DishShowcase';
import { useRestaurant } from '../lib/restaurant';

export function Landing() {
  const { name, establishedYear, contact } = useRestaurant();

  return (
    <main className="relative">
      <Hero />
      <HowItWorks />
      <DishShowcase />
      <section className="relative px-6 py-32 grain grain-soft">
        <div className="mx-auto max-w-4xl text-center">
          <p className="field-label text-gold-400">A small promise</p>
          <h2 className="mt-3 font-display text-4xl sm:text-5xl tracking-tightest font-semibold text-bone-50">
            We hold the table. <span className="accent-italic">You</span> hold the night.
          </h2>
          <p className="mt-6 text-bone-100/80 max-w-2xl mx-auto leading-relaxed">
            {name} is a small reservation system for a small restaurant.
            Built end-to-end, from the database to the page you’re reading now.
          </p>
          <Link to="/auth" data-cursor-hover className="btn-primary mt-10">
            Get started
          </Link>
        </div>
      </section>

      <footer className="border-t border-bone-200/5 bg-ink-950/80 backdrop-blur-md py-12 px-6 text-xs text-bone-400">
        <div className="mx-auto max-w-4xl flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="text-center md:text-left">
            <p className="font-display text-sm font-semibold text-bone-200 tracking-tightest">
              {name}<span className="text-gold-400">.</span>
            </p>
            <p className="mt-2 text-bone-500">© {establishedYear} {name}. All rights reserved.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-6 sm:gap-12 text-center sm:text-left text-bone-400">
            <div>
              <p className="font-semibold text-bone-300 uppercase tracking-wider text-[10px] font-mono">Contact</p>
              <p className="mt-1">{contact.email}</p>
              <p className="mt-0.5">{contact.phone}</p>
            </div>
            <div>
              <p className="font-semibold text-bone-300 uppercase tracking-wider text-[10px] font-mono">Location</p>
              <p className="mt-1 max-w-[200px] leading-relaxed">{contact.address}</p>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}

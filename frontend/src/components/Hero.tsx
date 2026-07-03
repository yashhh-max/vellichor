import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { usePageMeta } from '../hooks/usePageMeta';
import { SafeImage } from './SafeImage';

// Two Unsplash moody-food placeholders. Each falls back to a CSS gradient
// if the image never loads, so the page never looks broken.
const HERO_IMAGES = [
  'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1920&q=80',
  'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1920&q=80',
];
const HERO_FALLBACK =
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1920 1080'>
      <defs>
        <radialGradient id='g' cx='50%' cy='55%' r='75%'>
          <stop offset='0%' stop-color='#3a2a18'/>
          <stop offset='60%' stop-color='#15110d'/>
          <stop offset='100%' stop-color='#0a0a0a'/>
        </radialGradient>
      </defs>
      <rect width='1920' height='1080' fill='url(#g)'/>
    </svg>`
  );

import { useRestaurant } from '../lib/restaurant';

export function Hero() {
  const { name, tagline, establishedYear } = useRestaurant();
  usePageMeta(`${name} — Reserve a table`, 'Cinematic restaurant reservations.');
  const root = useRef<HTMLElement>(null);
  const kenRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!root.current) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;

    const ctx = gsap.context(() => {
      // Headline reveal: blur + y + opacity, line by line
      const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
      tl.from('.hero-eyebrow', { y: 16, opacity: 0, duration: 0.8 })
        .from(
          '.hero-line > span',
          {
            yPercent: 110,
            opacity: 0,
            filter: 'blur(8px)',
            duration: 1.2,
            stagger: 0.1,
          },
          '<0.1'
        )
        .to(
          '.hero-line > span',
          { filter: 'blur(0px)', duration: 1.2, stagger: 0.1, ease: 'power2.out' },
          '<0.1'
        )
        .from('.hero-sub', { y: 12, opacity: 0, duration: 0.7 }, '<0.3')
        .from('.hero-cta', { y: 12, opacity: 0, duration: 0.6, stagger: 0.08 }, '<0.1')
        .from('.hero-cue', { y: 8, opacity: 0, duration: 0.6 }, '<0.2');

      // Ken Burns: slow infinite scale on the hero image wrapper
      if (kenRef.current) {
        gsap.to(kenRef.current, {
          scale: 1.08,
          duration: 18,
          ease: 'none',
          repeat: -1,
          yoyo: true,
        });
      }

      // Bokeh glows drift gently, like candle flame
      const glows = gsap.utils.toArray<HTMLElement>('.hero-bokeh');
      glows.forEach((el, i) => {
        gsap.to(el, {
          xPercent: i % 2 === 0 ? 12 : -10,
          yPercent: i % 2 === 0 ? -8 : 12,
          duration: 14 + i * 2,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
        });
      });
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={root}
      className="relative min-h-screen w-full overflow-hidden grain"
    >
      {/* Background photo + dark gradient overlay */}
      <div className="absolute inset-0 -z-20 overflow-hidden bg-ink-900">
        <div
          ref={kenRef}
          className="h-full w-full will-change-transform"
          style={{ transform: 'scale(1.02)' }}
        >
          <SafeImage
            src={HERO_IMAGES[0]}
            fallbackSrc={HERO_FALLBACK}
            alt="A plated dish in moody low light"
            className="h-full w-full object-cover"
          />
        </div>
        {/* Bottom-to-top black gradient keeps the headline readable */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(10,10,10,0.35) 0%, rgba(10,10,10,0.20) 35%, rgba(10,10,10,0.55) 70%, rgba(10,10,10,0.92) 100%)',
          }}
        />
        {/* Soft warm tint to bridge the photo into the warm palette */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(60% 60% at 20% 30%, rgba(212,162,76,0.10), transparent 60%)',
            mixBlendMode: 'screen',
          }}
        />
      </div>

      {/* Drifting bokeh / candlelight glows */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        {[
          { top: '15%', left: '8%', size: 320, color: 'rgba(212,162,76,0.22)', delay: 0 },
          { top: '55%', left: '78%', size: 420, color: 'rgba(232,170,90,0.18)', delay: 1 },
          { top: '70%', left: '20%', size: 260, color: 'rgba(212,162,76,0.18)', delay: 2 },
          { top: '20%', left: '65%', size: 220, color: 'rgba(255,180,90,0.16)', delay: 3 },
        ].map((g, i) => (
          <span
            key={i}
            className="hero-bokeh absolute rounded-full blur-3xl will-change-transform"
            style={{
              top: g.top,
              left: g.left,
              width: g.size,
              height: g.size,
              background: `radial-gradient(circle, ${g.color} 0%, transparent 70%)`,
              animationDelay: `${g.delay}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 pt-32 pb-24">
        <p className="hero-eyebrow field-label text-gold-300">{name} · est. {establishedYear}</p>
        <h1 className="hero-headline mt-6 font-display text-[clamp(2.75rem,8vw,6.5rem)] leading-[0.95] tracking-tightest font-semibold text-bone-50">
          <span className="hero-line block overflow-hidden">
            <span className="block">
              {tagline.toLowerCase() === 'a quieter way to reserve a table' ? (
                <>
                  A quieter way
                  <span className="block mt-2">
                    to <span className="accent-italic">reserve</span> a table.
                  </span>
                </>
              ) : (
                tagline
              )}
            </span>
          </span>
        </h1>
        <p className="hero-sub mt-8 max-w-xl text-base sm:text-lg text-bone-100/80 leading-relaxed">
          Pick a time, a table, the people you’re bringing. We hold the rest — the
          lighting, the wine, the moment the room goes quiet at the window.
        </p>
        <div className="hero-cta mt-10 flex flex-wrap items-center gap-3">
          <Link to="/auth" data-cursor-hover className="btn-primary">
            Reserve a table
            <span aria-hidden>→</span>
          </Link>
          <a href="#how-it-works" data-cursor-hover className="btn-ghost">
            How it works
          </a>
        </div>
      </div>

      <a
        href="#how-it-works"
        data-cursor-hover
        className="hero-cue absolute bottom-8 left-1/2 z-10 -translate-x-1/2 text-bone-200/80 text-xs uppercase tracking-[0.3em] font-mono"
        aria-label="Scroll to learn more"
      >
        <span className="block">Scroll</span>
        <span
          aria-hidden
          className="mt-2 block h-8 w-px bg-bone-200/80 mx-auto"
          style={{ animation: 'cue 1.6s ease-in-out infinite', transformOrigin: 'top' }}
        />
        <style>{`@keyframes cue { 0%,100% { transform: scaleY(0.4); opacity: 0.4 } 50% { transform: scaleY(1); opacity: 1 } }`}</style>
      </a>
    </section>
  );
}

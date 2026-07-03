import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SafeImage } from './SafeImage';

gsap.registerPlugin(ScrollTrigger);

// Three moody dish images. They fall back to gold gradient placeholders
// if the network can't reach Unsplash.
const DISHES = [
  {
    src: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
    label: 'Heritage tomato',
  },
  {
    src: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=600&q=80',
    label: 'Hand-cut pasta',
  },
  {
    src: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=600&q=80',
    label: 'Slow-braised short rib',
  },
  {
    src: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=600&q=80',
    label: 'Burnt honey tart',
  },
];

// Same shape as each dish, drawn with CSS in case the image never loads.
const dishFallback =
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 600'>
      <defs>
        <radialGradient id='g' cx='50%' cy='45%' r='60%'>
          <stop offset='0%' stop-color='#3a2a18'/>
          <stop offset='100%' stop-color='#15110d'/>
        </radialGradient>
      </defs>
      <rect width='600' height='600' fill='url(#g)'/>
    </svg>`
  );

export function DishShowcase() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!sectionRef.current) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;

    const ctx = gsap.context(() => {
      // Each dish: fade + scale on scroll entrance, stagger 0.1s
      gsap.from('.dish-circle', {
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 70%',
          once: true,
        },
        opacity: 0,
        scale: 0.6,
        y: 24,
        duration: 0.9,
        ease: 'expo.out',
        stagger: 0.12,
      });

      // Subtle continuous float
      gsap.utils.toArray<HTMLElement>('.dish-circle').forEach((el, i) => {
        gsap.to(el, {
          yPercent: i % 2 === 0 ? -3 : 3,
          duration: 6 + i * 0.6,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
        });
      });

      // Heading + lede
      gsap.from('.showcase-heading > *', {
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 75%',
          once: true,
        },
        opacity: 0,
        y: 20,
        duration: 0.7,
        ease: 'expo.out',
        stagger: 0.08,
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative w-full px-6 py-32 grain grain-soft"
    >
      <div className="mx-auto max-w-5xl text-center">
        <p className="showcase-heading field-label text-gold-400">Tonight, on the table</p>
        <h2 className="showcase-heading mt-3 font-display text-4xl sm:text-5xl tracking-tightest font-semibold text-bone-50">
          The kitchen, in <span className="accent-italic">glimpses</span>.
        </h2>
        <p className="showcase-heading mt-4 text-bone-100/70 max-w-xl mx-auto leading-relaxed">
          A few of the dishes our chef has been quietly obsessing over. Book a
          table to taste the rest.
        </p>
      </div>

      <ul className="mx-auto mt-16 grid max-w-5xl grid-cols-2 gap-y-14 sm:grid-cols-4 sm:gap-y-0 place-items-center">
        {DISHES.map((d) => (
          <li key={d.label} className="group flex flex-col items-center">
            <div
              data-cursor-hover
              className="dish-circle relative aspect-square w-36 sm:w-44 md:w-48 overflow-hidden rounded-full border border-bone-200/10
                         shadow-[0_8px_30px_-12px_rgba(0,0,0,0.6)]
                         transition-[border-color,box-shadow] duration-500 ease-out-expo
                         group-hover:border-gold-400/70
                         group-hover:shadow-[0_0_36px_-4px_rgba(212,162,76,0.55)]"
              style={{
                background: 'radial-gradient(circle at 50% 45%, #2d2013 0%, #0f0b07 100%)'
              }}
            >
              <SafeImage
                src={d.src}
                fallbackSrc={dishFallback}
                alt={d.label}
                className="h-full w-full object-cover will-change-transform transition-transform duration-500 ease-out-expo group-hover:scale-110"
              />
              {/* Warm vignette so the circle always reads against the page */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    'radial-gradient(circle at 50% 50%, transparent 55%, rgba(10,10,10,0.45) 100%)',
                }}
              />
            </div>
            <p className="mt-5 text-sm tracking-wide text-bone-100/80 font-display italic">
              {d.label}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

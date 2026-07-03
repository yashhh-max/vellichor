import { useLayoutEffect, useRef, useEffect, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SafeImage } from './SafeImage';

gsap.registerPlugin(ScrollTrigger);

type Step = {
  caption: string;
  title: string;
  description: string;
  src: string;
};

type RevealDirection = 'left' | 'right' | 'bottom';

type StepCardProps = {
  step: Step;
  direction: RevealDirection;
};

const FALLBACK =
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 800'>
      <defs>
        <radialGradient id='g' cx='50%' cy='50%' r='70%'>
          <stop offset='0%' stop-color='#3a2a18'/>
          <stop offset='100%' stop-color='#0a0a0a'/>
        </radialGradient>
      </defs>
      <rect width='1200' height='800' fill='url(#g)'/>
    </svg>`
  );

const STEPS: Step[] = [
  {
    caption: 'Step 01',
    title: 'Choose your table',
    description:
      'From a two-top by the window to a six for friends. Pick the seat, we hold it for the night.',
    src: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80',
  },
  {
    caption: 'Step 02',
    title: 'Pick a time',
    description:
      "Lunch, dinner, or a late seating — see what's open and lock it in, in under a minute.",
    src: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=80',
  },
  {
    caption: 'Step 03',
    title: 'Instant confirmation',
    description:
      "No back-and-forth, no phone tag. A clean confirmation page, and your table's held.",
    src: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1200&q=80',
  },
];

// Preload images to ensure they're loaded before animations start.
// Resolves with `true` once every image is in the browser cache so we can
// re-measure ScrollTrigger pin distances safely (pinned sections are very
// sensitive to layout shifts that happen after pin distance is computed).
const preloadImages = (): Promise<boolean> => {
  return Promise.all(
    STEPS.map(step => {
      return new Promise<boolean>(resolve => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(true); // resolve on error too — we don't want a failed image to block refresh forever
        img.src = step.src;
      });
    })
  ).then(() => true);
};

function getInitialClipPath(direction: RevealDirection) {
  switch (direction) {
    case 'left':
      return 'inset(0 100% 0 0)';
    case 'bottom':
      return 'inset(100% 0 0 0)';
    case 'right':
    default:
      return 'inset(0 0 0 100%)';
  }
}

function HowItWorksStepCard({ step, direction }: StepCardProps) {
  const rootRef = useRef<HTMLElement>(null);
  const labelRef = useRef<HTMLParagraphElement>(null);
  const titleFrameRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const descriptionRef = useRef<HTMLParagraphElement>(null);
  const artRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!rootRef.current) return;
    if (!labelRef.current || !titleFrameRef.current || !titleRef.current || !descriptionRef.current || !artRef.current || !imageRef.current) {
      return;
    }

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const root = rootRef.current;
    const label = labelRef.current;
    const titleFrame = titleFrameRef.current;
    const title = titleRef.current;
    const description = descriptionRef.current;
    const art = artRef.current;
    const image = imageRef.current;
    const titleWords = Array.from(title.querySelectorAll<HTMLElement>('.how-step-word'));
    const initialClipPath = getInitialClipPath(direction);

    gsap.killTweensOf([label, titleFrame, title, description, art, image, ...titleWords]);

    // Initial states -------------------------------------------------------
    if (reduce) {
      // Reduced motion: no pin, no freeze. Just default-visible fades driven
      // by a normal scroll trigger. Pin + a forced scroll distance can be
      // disorienting for users who've requested reduced motion.
      gsap.set([label, titleFrame, description, art, image], { autoAlpha: 1, y: 0 });
      gsap.set(titleWords, { autoAlpha: 1, y: 0 });
      gsap.set(image, { scale: 1, clipPath: 'none', transformOrigin: '50% 50%' });

      const reduceTl = gsap.timeline({
        scrollTrigger: {
          trigger: root,
          start: 'top 80%',
          toggleActions: 'play none none reverse',
        },
      });

      // Quick subtle nudge so something still happens on scroll-in.
      reduceTl
        .from(label, { autoAlpha: 0, y: 10, duration: 0.4, ease: 'power2.out' }, 0)
        .from(titleWords, { autoAlpha: 0, y: 8, duration: 0.4, stagger: 0.03, ease: 'power2.out' }, 0.05)
        .from(description, { autoAlpha: 0, y: 8, duration: 0.4, ease: 'power2.out' }, 0.15)
        .from(art, { autoAlpha: 0, duration: 0.4, ease: 'power2.out' }, 0.2);

      return () => {
        if (reduceTl.scrollTrigger) reduceTl.scrollTrigger.kill();
        reduceTl.kill();
        gsap.killTweensOf([label, titleFrame, title, description, art, image, ...titleWords]);
        gsap.set([label, titleFrame, title, description, art, image, ...titleWords], { clearProps: 'all' });
      };
    }

    // Full-motion path: pin the step in place and scrub the entrance.
    // The step freezes in the viewport for `end` worth of scroll distance,
    // then releases and the user scrolls normally into the next step.
    gsap.set(label, { autoAlpha: 0, y: 14 });
    gsap.set(description, { autoAlpha: 0, y: 16 });
    gsap.set(art, { autoAlpha: 0 });
    gsap.set(titleFrame, { autoAlpha: 1 });
    gsap.set(titleWords, { autoAlpha: 0, y: 20 });
    gsap.set(image, {
      autoAlpha: 0,
      scale: 1.1,
      clipPath: initialClipPath,
      transformOrigin: '50% 50%',
    });

    const stepTl = gsap.timeline({
      scrollTrigger: {
        trigger: root,
        start: 'top top',
        end: '+=100%', // one full viewport height of pinned scroll distance
        pin: true,
        scrub: 1, // smooth follow-through as the user scrolls through the pin
        anticipatePin: 1,
      },
    });

    stepTl
      .to(image, { autoAlpha: 1, clipPath: 'inset(0 0% 0 0)', scale: 1, duration: 0.4, ease: 'none' }, 0)
      .to(titleWords, { autoAlpha: 1, y: 0, duration: 0.3, stagger: 0.05, ease: 'none' }, 0.1)
      .to(label, { autoAlpha: 1, y: 0, duration: 0.3, ease: 'none' }, 0.15)
      .to(description, { autoAlpha: 1, y: 0, duration: 0.3, ease: 'none' }, 0.3)
      .to(art, { autoAlpha: 1, duration: 0.3, ease: 'none' }, 0.3);

    return () => {
      if (stepTl.scrollTrigger) stepTl.scrollTrigger.kill();
      stepTl.kill();
      gsap.killTweensOf([label, titleFrame, title, description, art, image, ...titleWords]);
      gsap.set([label, titleFrame, title, description, art, image, ...titleWords], { clearProps: 'all' });
    };
  }, [direction]);

  const words = step.title.split(/\s+/).filter(Boolean);

  return (
    <article
      ref={rootRef}
      className="how-it-works-step relative grid min-h-[72vh] items-center py-10 md:grid-cols-2 md:gap-12 md:py-14 mb-20 sm:mb-24 last:mb-0"
    >
      <div className="order-2 max-w-md md:order-1">
        <p ref={labelRef} className="step-caption field-label text-gold-400">
          {step.caption}
        </p>
        <div ref={titleFrameRef} className="mt-3">
          <h2
            ref={titleRef}
            className="font-display text-4xl font-semibold tracking-tightest text-bone-50 sm:text-6xl"
          >
            <span className="sr-only">{step.title}</span>
            {words.map((word, index) => (
              <span
                key={`${step.caption}-${index}-${word}`}
                className="how-step-word headline-word mr-[0.22em] inline-block"
                aria-hidden="true"
              >
                {word}
              </span>
            ))}
          </h2>
        </div>
        <p ref={descriptionRef} className="step-description mt-4 leading-relaxed text-bone-100/80">
          {step.description}
        </p>
      </div>

      <div
        ref={artRef}
        className="step-image-wrap relative order-1 aspect-[3/2] w-full overflow-hidden rounded-2xl border border-gold-400/20 md:order-2"
      >
        <div ref={imageRef} className="step-image absolute inset-0 will-change-transform">
          <SafeImage
            src={step.src}
            fallbackSrc={FALLBACK}
            alt={step.title}
            className="absolute inset-0 h-full w-full object-cover"
          />
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background: 'linear-gradient(180deg, rgba(10,10,10,0) 58%, rgba(10,10,10,0.55) 100%)',
          }}
        />
      </div>
    </article>
  );
}

export function HowItWorks() {
  // Track whether all step images have finished loading. We use this to
  // call ScrollTrigger.refresh() exactly once after images are in, so pin
  // distances are measured against the final layout (not against placeholder
  // boxes that get re-sized when images decode).
  const [imagesReady, setImagesReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    preloadImages()
      .catch(err => {
        // We don't want a single failed image to block refresh forever, so
        // preloadImages resolves true on error. This catch is just a safety
        // net for unexpected throw paths.
        console.warn('Failed to preload images:', err);
      })
      .finally(() => {
        if (!cancelled) setImagesReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!imagesReady) return;
    // Pinned sections are sensitive to layout shifts that happen after the
    // pin distance is computed. Re-measure now that every step image has
    // decoded and contributed its real height to the document.
    ScrollTrigger.refresh();
  }, [imagesReady]);

  return (
    <section id="how-it-works" className="relative w-full overflow-hidden grain grain-soft py-24 sm:py-32">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          opacity: 0.1,
          mixBlendMode: 'overlay',
          backgroundImage:
            "url(\"data:image/svg+xml;charset=utf-8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1   0 0 0 0 1   0 0 0 0 1   0 0 0 0.6 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
        }}
      />

      <div className="relative mx-auto max-w-6xl px-6">
        <HowItWorksStepCard step={STEPS[0]} direction="right" />
        <HowItWorksStepCard step={STEPS[1]} direction="bottom" />
        <HowItWorksStepCard step={STEPS[2]} direction="left" />
      </div>
    </section>
  );
}

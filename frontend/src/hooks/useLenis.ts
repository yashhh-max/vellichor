import { useEffect } from 'react';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * Wires Lenis smooth scrolling to GSAP ScrollTrigger.
 * Returns the Lenis instance so callers can read .scrollTo, etc.
 *
 * Cleanup: stops the raf loop and unsubscribes from ScrollTrigger
 * updates on unmount so it never leaks across routes.
 */
export function useLenis() {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      // Respect users who prefer reduced motion: bail out to native scroll.
      autoRaf: false,
    });

    let frame: number;
    const raf = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);

    // Keep ScrollTrigger in sync with Lenis's virtual scroll position.
    const onScroll = () => ScrollTrigger.update();
    lenis.on('scroll', onScroll);

    // If the user has reduced motion, we just don't initialize — fall back.
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      cancelAnimationFrame(frame);
      lenis.destroy();
      return;
    }

    return () => {
      cancelAnimationFrame(frame);
      lenis.off('scroll', onScroll);
      lenis.destroy();
    };
  }, []);
}

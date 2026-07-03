import { useEffect, useRef, useState } from 'react';

interface Pos {
  x: number;
  y: number;
}

/**
 * Custom cursor:
 * - A small dot that follows the mouse 1:1 (snappy).
 * - A larger circle that follows with eased lag (the visual "blob").
 * - On hover of any element with [data-cursor-hover], the outer circle
 *   scales up and switches to the accent color.
 *
 * Hidden on touch / coarse pointer devices — the OS cursor stays.
 */
export function Cursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [hover, setHover] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const fine = window.matchMedia('(pointer: fine)').matches;
    if (!fine) return;
    setEnabled(true);
    document.documentElement.classList.add('has-custom-cursor');
    return () => document.documentElement.classList.remove('has-custom-cursor');
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const dot = dotRef.current!;
    const ring = ringRef.current!;
    const mouse: Pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const dotPos: Pos = { ...mouse };
    const ringPos: Pos = { ...mouse };

    let frame = 0;
    const render = () => {
      // Dot: instant follow
      dotPos.x += (mouse.x - dotPos.x) * 0.9;
      dotPos.y += (mouse.y - dotPos.y) * 0.9;
      dot.style.transform = `translate3d(${dotPos.x}px, ${dotPos.y}px, 0) translate(-50%, -50%)`;

      // Ring: eased follow
      ringPos.x += (mouse.x - ringPos.x) * 0.18;
      ringPos.y += (mouse.y - ringPos.y) * 0.18;
      ring.style.transform = `translate3d(${ringPos.x}px, ${ringPos.y}px, 0) translate(-50%, -50%)`;

      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);

    const onMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    const onOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('[data-cursor-hover]')) setHover(true);
    };
    const onOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('[data-cursor-hover]')) setHover(false);
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('mouseover', onOver, { passive: true });
    window.addEventListener('mouseout', onOut, { passive: true });

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseover', onOver);
      window.removeEventListener('mouseout', onOut);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <>
      <div
        ref={dotRef}
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[60] h-1.5 w-1.5 rounded-full bg-bone-50 will-change-transform"
      />
      <div
        ref={ringRef}
        aria-hidden
        className={
          'pointer-events-none fixed left-0 top-0 z-[60] h-9 w-9 rounded-full border transition-[width,height,background-color,border-color,opacity] duration-300 ease-out-expo will-change-transform ' +
          (hover
            ? 'w-14 h-14 bg-accent/15 border-accent/80'
            : 'border-bone-50/40 bg-transparent')
        }
      />
    </>
  );
}

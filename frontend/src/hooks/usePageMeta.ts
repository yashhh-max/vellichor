import { useEffect } from 'react';

/**
 * Sets <title> and a one-line description on mount.
 * Defensive: never throws on mount/unmount.
 */
export function usePageMeta(title: string, description?: string) {
  useEffect(() => {
    const prev = document.title;
    document.title = title;
    if (description) {
      let meta = document.querySelector('meta[name="description"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', 'description');
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', description);
    }
    return () => {
      document.title = prev;
    };
  }, [title, description]);
}

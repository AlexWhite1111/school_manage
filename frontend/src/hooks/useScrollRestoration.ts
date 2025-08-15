import { useEffect } from 'react';

/**
 * Restore and persist scroll position for a given scroll container per route key.
 * Works for both window scrolling and a specific container (e.g., Layout Content with overflow: auto).
 */
export const useScrollRestoration = (
  key: string,
  container?: HTMLElement | null
) => {
  useEffect(() => {
    const storageKey = `scroll:${key}`;

    const target = container ?? window;

    // Restore
    const saved = sessionStorage.getItem(storageKey);
    const y = saved ? parseInt(saved, 10) : 0;
    if (Number.isFinite(y)) {
      if (container) {
        container.scrollTop = y;
      } else {
        window.scrollTo(0, y);
      }
    }

    const handler = () => {
      const pos = container ? container.scrollTop : window.scrollY;
      sessionStorage.setItem(storageKey, String(pos));
    };

    // Attach
    if (container) {
      container.addEventListener('scroll', handler, { passive: true });
    } else {
      window.addEventListener('scroll', handler, { passive: true });
    }

    // Save on unload as兜底
    window.addEventListener('beforeunload', handler);

    return () => {
      handler();
      if (container) {
        container.removeEventListener('scroll', handler as any);
      } else {
        window.removeEventListener('scroll', handler as any);
      }
      window.removeEventListener('beforeunload', handler as any);
    };
  }, [key, container]);
};


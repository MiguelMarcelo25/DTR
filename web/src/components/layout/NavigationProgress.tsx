'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

/**
 * Thin top progress bar that gives immediate feedback on navigation.
 *
 * App Router doesn't expose router events, so we detect the START by listening
 * (capture phase) for clicks on internal links, and the FINISH by watching
 * `usePathname()` — which only updates once the destination route has committed.
 * A safety timeout completes the bar if a navigation never resolves.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const trickle = useRef<ReturnType<typeof setInterval> | null>(null);
  const hide = useRef<ReturnType<typeof setTimeout> | null>(null);
  const safety = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearTimers() {
    if (trickle.current) clearInterval(trickle.current);
    if (hide.current) clearTimeout(hide.current);
    if (safety.current) clearTimeout(safety.current);
  }

  function start() {
    clearTimers();
    setVisible(true);
    setProgress(10);
    trickle.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 90) return p;
        const inc = p < 45 ? 9 : p < 70 ? 4 : 1.5;
        return Math.min(90, p + inc);
      });
    }, 180);
    safety.current = setTimeout(finish, 8000);
  }

  function finish() {
    clearTimers();
    setProgress(100);
    hide.current = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 240);
  }

  // Detect navigation start from internal link clicks.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as HTMLElement | null)?.closest('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      const target = anchor.getAttribute('target');
      if (!href || !href.startsWith('/') || target === '_blank' || anchor.hasAttribute('download')) return;
      const dest = new URL(href, window.location.origin);
      // Skip if it's the page we're already on
      if (dest.pathname === window.location.pathname && dest.search === window.location.search) return;
      start();
    }
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  // Finish whenever the committed pathname changes.
  useEffect(() => {
    finish();
    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5 transition-opacity duration-300',
        visible ? 'opacity-100' : 'opacity-0',
      )}
    >
      <div
        className="h-full bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.6)] transition-[width] duration-200 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

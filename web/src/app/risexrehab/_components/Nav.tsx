'use client';

import * as React from 'react';
import { Menu, X } from 'lucide-react';
import { RXR, CTA } from '../content';
import { useBooking } from './booking/BookingProvider';

export function Nav() {
  const { openBooking } = useBooking();
  const [scrolled, setScrolled] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled ? 'border-b border-white/10 bg-[#0B0C0E]/85 backdrop-blur-md' : 'bg-transparent'
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:h-20 sm:px-8">
        <a href="#top" className="rxr-display text-xl tracking-tight text-[#F7F6F3] sm:text-2xl">
          RISE<span className="text-[#C6FF00]">X</span>REHAB
        </a>

        <div className="hidden items-center gap-8 md:flex">
          {RXR.nav.map((n) => (
            <a
              key={n.href}
              href={n.href}
              className="rxr-mono text-xs uppercase tracking-wider text-[#9aa0a6] transition-colors hover:text-[#F7F6F3]"
            >
              {n.label}
            </a>
          ))}
          <button
            type="button"
            onClick={openBooking}
            className="inline-flex cursor-pointer items-center rounded-full bg-[#C6FF00] px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-black transition-all hover:brightness-110 hover:shadow-[0_0_30px_-8px_#C6FF00] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6FF00]"
          >
            {CTA.label}
          </button>
        </div>

        <button
          type="button"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="flex h-10 w-10 items-center justify-center rounded-md text-[#F7F6F3] md:hidden"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      {/* Mobile drawer */}
      {open && (
        <div className="border-t border-white/10 bg-[#0B0C0E]/95 backdrop-blur-md md:hidden">
          <div className="space-y-1 px-5 py-4">
            {RXR.nav.map((n) => (
              <a
                key={n.href}
                href={n.href}
                onClick={() => setOpen(false)}
                className="rxr-mono block rounded-md px-2 py-3 text-sm uppercase tracking-wider text-[#9aa0a6] hover:bg-white/5 hover:text-[#F7F6F3]"
              >
                {n.label}
              </a>
            ))}
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                openBooking();
              }}
              className="mt-2 inline-flex w-full cursor-pointer items-center justify-center rounded-full bg-[#C6FF00] px-5 py-3 text-sm font-bold uppercase tracking-wide text-black"
            >
              {CTA.label}
            </button>
          </div>
        </div>
      )}
    </header>
  );
}

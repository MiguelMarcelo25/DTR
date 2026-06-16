'use client';

import * as React from 'react';
import { useBooking } from './BookingProvider';

type Variant = 'primary' | 'ghost' | 'light';

function cx(...c: Array<string | false | undefined>) {
  return c.filter(Boolean).join(' ');
}

const base =
  'inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-sm font-bold uppercase tracking-wide transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6FF00] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0C0E] cursor-pointer';

const variants: Record<Variant, string> = {
  primary: 'bg-[#C6FF00] text-black hover:brightness-110 hover:shadow-[0_0_40px_-8px_#C6FF00]',
  ghost: 'border border-white/25 text-[#F7F6F3] hover:border-[#C6FF00] hover:text-[#C6FF00]',
  light: 'bg-[#0B0C0E] text-[#F7F6F3] hover:bg-black',
};

/**
 * Opens the shared booking modal. Drop-in trigger usable from any (server)
 * section — styled to match the CTA buttons. `unstyled` lets callers (e.g. the
 * compact nav pill) provide their own className entirely.
 */
export function BookButton({
  children,
  variant = 'primary',
  className,
  unstyled = false,
}: {
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
  unstyled?: boolean;
}) {
  const { openBooking } = useBooking();
  return (
    <button type="button" onClick={openBooking} className={unstyled ? className : cx(base, variants[variant], className)}>
      {children}
    </button>
  );
}

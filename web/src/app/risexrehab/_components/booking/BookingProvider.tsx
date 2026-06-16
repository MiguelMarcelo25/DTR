'use client';

import * as React from 'react';
import { BookingModal } from './BookingModal';

const BookingContext = React.createContext<{ openBooking: () => void } | null>(null);

export function useBooking() {
  const ctx = React.useContext(BookingContext);
  if (!ctx) throw new Error('useBooking must be used within <BookingProvider>');
  return ctx;
}

/** Wraps the page, exposes openBooking(), and mounts a single shared modal. */
export function BookingProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const value = React.useMemo(() => ({ openBooking: () => setOpen(true) }), []);
  return (
    <BookingContext.Provider value={value}>
      {children}
      <BookingModal open={open} onClose={() => setOpen(false)} />
    </BookingContext.Provider>
  );
}

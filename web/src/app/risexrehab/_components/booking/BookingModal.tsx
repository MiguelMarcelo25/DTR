'use client';

import * as React from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  isSameDay,
  isSameMonth,
  isToday,
  isBefore,
  startOfDay,
} from 'date-fns';
import {
  X,
  ChevronLeft,
  ChevronRight,
  UserRound,
  CalendarDays,
  Clock,
  Stethoscope,
  CheckCircle2,
  Facebook,
} from 'lucide-react';
import { RXR, CTA } from '../../content';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function Label({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rxr-mono mb-2 flex items-center gap-2 text-xs uppercase tracking-wider text-[#9aa0a6]">
      <span className="text-[#2EE6D6]">{icon}</span>
      {children}
    </div>
  );
}

export function BookingModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = React.useState<'form' | 'done'>('form');
  const [name, setName] = React.useState('');
  const [date, setDate] = React.useState<Date | null>(null);
  const [time, setTime] = React.useState('');
  const [coach, setCoach] = React.useState<string>(RXR.booking.coaches[0]);
  const [view, setView] = React.useState<Date>(() => new Date());
  const [error, setError] = React.useState('');

  // Reset to a clean form whenever the modal closes.
  React.useEffect(() => {
    if (!open) {
      setStep('form');
      setName('');
      setDate(null);
      setTime('');
      setCoach(RXR.booking.coaches[0]);
      setError('');
      setView(new Date());
    }
  }, [open]);

  // Escape to close + body scroll lock while open.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  const today = startOfDay(new Date());
  const monthStart = startOfMonth(view);
  const days = eachDayOfInterval({ start: startOfWeek(monthStart), end: endOfWeek(endOfMonth(monthStart)) });

  function submit() {
    if (!name.trim()) return setError('Please enter your name.');
    if (!date) return setError('Please choose a date.');
    if (!time) return setError('Please choose a time.');
    setError('');
    setStep('done');
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Book a free assessment"
    >
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

      <div className="relative z-10 max-h-[94vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-white/10 bg-[#111315] text-[#F7F6F3] shadow-2xl sm:m-4 sm:rounded-3xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#111315]/95 px-6 py-4 backdrop-blur">
          <div>
            <div className="rxr-eyebrow text-[#9aa0a6]">Free assessment</div>
            <h2 className="rxr-display text-2xl">{step === 'form' ? 'Book your visit' : "You're booked"}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-[#F7F6F3] transition-colors hover:border-[#C6FF00] hover:text-[#C6FF00] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6FF00]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {step === 'form' ? (
          <div className="space-y-7 p-6">
            {/* Name */}
            <div>
              <Label icon={<UserRound className="h-3.5 w-3.5" />}>Your name</Label>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Juan dela Cruz"
                className="w-full rounded-xl border border-white/12 bg-[#0B0C0E] px-4 py-3 text-sm text-[#F7F6F3] placeholder:text-[#9aa0a6]/60 focus-visible:border-[#2EE6D6] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#2EE6D6]"
              />
            </div>

            {/* Date — inline calendar */}
            <div>
              <Label icon={<CalendarDays className="h-3.5 w-3.5" />}>Select a date</Label>
              <div className="rounded-2xl border border-white/10 bg-[#0B0C0E] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setView((v) => addMonths(v, -1))}
                    disabled={isSameMonth(view, today)}
                    aria-label="Previous month"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-[#9aa0a6] transition-colors hover:bg-white/5 hover:text-[#F7F6F3] disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="rxr-display text-lg">{format(view, 'MMMM yyyy')}</span>
                  <button
                    type="button"
                    onClick={() => setView((v) => addMonths(v, 1))}
                    aria-label="Next month"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-[#9aa0a6] transition-colors hover:bg-white/5 hover:text-[#F7F6F3]"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                <div className="mb-1 grid grid-cols-7 gap-1">
                  {WEEKDAYS.map((w) => (
                    <div key={w} className="rxr-mono py-1 text-center text-[10px] uppercase text-[#9aa0a6]">
                      {w}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {days.map((day) => {
                    const past = isBefore(day, today);
                    const inMonth = isSameMonth(day, monthStart);
                    const sel = date && isSameDay(day, date);
                    return (
                      <button
                        key={day.toISOString()}
                        type="button"
                        disabled={past}
                        onClick={() => setDate(day)}
                        className={[
                          'flex h-9 w-full items-center justify-center rounded-lg text-sm tabular-nums transition-colors',
                          !inMonth && 'text-[#9aa0a6]/30',
                          past && 'cursor-not-allowed text-[#9aa0a6]/25 line-through',
                          sel
                            ? 'bg-[#C6FF00] font-bold text-black'
                            : !past && 'text-[#F7F6F3] hover:bg-white/10',
                          isToday(day) && !sel && !past && 'ring-1 ring-[#2EE6D6]/60',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        {format(day, 'd')}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Time */}
            <div>
              <Label icon={<Clock className="h-3.5 w-3.5" />}>Select a time</Label>
              <div className="grid grid-cols-3 gap-2">
                {RXR.booking.times.map((t) => {
                  const active = time === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTime(t)}
                      aria-pressed={active}
                      className={[
                        'rounded-xl border px-2 py-2.5 text-sm font-medium transition-colors',
                        active
                          ? 'border-[#C6FF00] bg-[#C6FF00]/10 text-[#C6FF00]'
                          : 'border-white/12 text-[#F7F6F3] hover:border-[#2EE6D6]/60 hover:text-[#2EE6D6]',
                      ].join(' ')}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Coach / therapist */}
            <div>
              <Label icon={<Stethoscope className="h-3.5 w-3.5" />}>Coach / therapist</Label>
              <select
                value={coach}
                onChange={(e) => setCoach(e.target.value)}
                className="w-full appearance-none rounded-xl border border-white/12 bg-[#0B0C0E] px-4 py-3 text-sm text-[#F7F6F3] focus-visible:border-[#2EE6D6] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#2EE6D6]"
              >
                {RXR.booking.coaches.map((c) => (
                  <option key={c} value={c} className="bg-[#111315]">
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <p role="alert" className="text-sm font-medium text-[#ff7a7a]">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={submit}
              className="w-full rounded-full bg-[#C6FF00] px-7 py-3.5 text-sm font-bold uppercase tracking-wide text-black transition-all hover:brightness-110 hover:shadow-[0_0_40px_-8px_#C6FF00] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6FF00] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111315]"
            >
              Confirm booking
            </button>
            <p className="text-center text-xs text-[#9aa0a6]">
              No payment needed — your free assessment request is confirmed via Facebook Messenger.
            </p>
          </div>
        ) : (
          // Confirmation — announced to assistive tech via role="alert".
          <div className="space-y-6 p-6" role="alert" aria-live="assertive">
            <div className="flex flex-col items-center gap-3 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#C6FF00]/15 text-[#C6FF00]">
                <CheckCircle2 className="h-9 w-9" />
              </span>
              <h3 className="rxr-display text-3xl">
                You’re <span className="rxr-grad">booked</span>!
              </h3>
              <p className="max-w-sm text-sm text-[#9aa0a6]">
                {name.trim()}, your free assessment is reserved. We’ll confirm the details with you on Facebook
                Messenger shortly.
              </p>
            </div>

            <dl className="space-y-px overflow-hidden rounded-2xl border border-white/10 text-sm">
              {[
                { k: 'Date', v: date ? format(date, 'EEEE, MMMM d, yyyy') : '' },
                { k: 'Time', v: time },
                { k: 'With', v: coach },
                { k: 'Location', v: RXR.contact.location },
              ].map((row) => (
                <div key={row.k} className="flex gap-4 bg-[#0B0C0E] px-4 py-3">
                  <dt className="rxr-mono w-20 shrink-0 text-xs uppercase tracking-wider text-[#9aa0a6]">{row.k}</dt>
                  <dd className="text-[#F7F6F3]">{row.v}</dd>
                </div>
              ))}
            </dl>

            <div className="flex flex-col gap-3 sm:flex-row">
              <a
                href={CTA.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[#C6FF00] px-6 py-3 text-sm font-bold uppercase tracking-wide text-black transition-all hover:brightness-110"
              >
                <Facebook className="h-4 w-4" /> Confirm on Messenger
              </a>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex flex-1 items-center justify-center rounded-full border border-white/20 px-6 py-3 text-sm font-bold uppercase tracking-wide text-[#F7F6F3] transition-colors hover:border-[#C6FF00] hover:text-[#C6FF00]"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

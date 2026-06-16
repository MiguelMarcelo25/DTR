import {
  Trophy,
  Activity,
  HeartPulse,
  ShieldCheck,
  PersonStanding,
  Baby,
  ArrowUpRight,
  type LucideIcon,
} from 'lucide-react';
import { Section, Heading, Chip } from './ui';
import { Reveal } from './Reveal';
import { RXR, CTA } from '../content';
import { BookButton } from './booking/BookButton';

/**
 * WhoItsFor — "Built for everyone": pros to first-timers, kids to seniors.
 * Split layout: an accent-framed supporting image paired with a bold,
 * icon-led audience grid. Emphasizes inclusivity + premium care.
 */

// Pair each audience string with an icon + a short supporting note.
// Index-aligned with RXR.audience (6 items).
const META: { icon: LucideIcon; note: string }[] = [
  { icon: Trophy, note: 'Return-to-play programming' },
  { icon: Activity, note: 'Stay strong for daily life' },
  { icon: ShieldCheck, note: 'Rebuild after the OR' },
  { icon: HeartPulse, note: 'Break the pain cycle' },
  { icon: PersonStanding, note: 'Mobility, balance & strength' },
  { icon: Baby, note: 'Gentle, age-appropriate care' },
];

export function WhoItsFor() {
  return (
    <Section id="who" tone="panel" className="overflow-hidden">
      <Reveal>
        <Heading eyebrow="Who it’s for">
          Built for <span className="rxr-grad">everyone</span>.<br className="hidden sm:block" /> Pros to
          first-timers.
        </Heading>
        <p className="mt-5 max-w-2xl text-balance text-base leading-relaxed text-[#9aa0a6] sm:text-lg">
          Premium care isn’t reserved for elite athletes. From competitors chasing a podium to a parent
          rebuilding after surgery — every body gets the same evidence-based, expert-led attention.
        </p>
      </Reveal>

      <div className="mt-14 grid items-stretch gap-8 lg:mt-16 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        {/* Supporting image with brand accent frame */}
        <Reveal className="h-full">
          <figure className="group relative h-full min-h-[22rem] overflow-hidden rounded-3xl border border-white/10 bg-[#0B0C0E]">
            <img
              src={RXR.images.whoItsFor}
              alt="A coach guiding a client through a strength and mobility exercise at the Rise X Rehab clinic"
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
            />
            {/* Legibility + brand wash */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0B0C0E] via-[#0B0C0E]/35 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-br from-[#1B2A4A]/30 via-transparent to-transparent" />

            {/* Volt corner accents */}
            <span aria-hidden className="absolute left-5 top-5 h-10 w-10 border-l-2 border-t-2 border-[#C6FF00]" />
            <span
              aria-hidden
              className="absolute bottom-5 right-5 h-10 w-10 border-b-2 border-r-2 border-[#2EE6D6]"
            />

            <figcaption className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
              <Chip className="border-[#C6FF00]/30 text-[#C6FF00]">All ages · all levels</Chip>
              <p className="rxr-display mt-3 text-3xl leading-[0.95] text-[#F7F6F3] sm:text-4xl">
                One clinic.
                <br />
                Every comeback.
              </p>
            </figcaption>
          </figure>
        </Reveal>

        {/* Audience grid */}
        <div className="grid gap-4 sm:grid-cols-2">
          {RXR.audience.map((label, i) => {
            const { icon: Icon, note } = META[i] ?? META[0];
            return (
              <Reveal key={label} delay={i * 70} className="h-full">
                <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0B0C0E] p-6 transition-all duration-200 hover:-translate-y-1 hover:border-[#C6FF00]/40 hover:shadow-[0_18px_50px_-20px_rgba(198,255,0,0.35)] focus-within:border-[#C6FF00]/40">
                  {/* number marker */}
                  <span className="rxr-mono absolute right-5 top-5 text-xs tracking-widest text-white/20">
                    {String(i + 1).padStart(2, '0')}
                  </span>

                  <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-[#111315] text-[#2EE6D6] transition-colors duration-200 group-hover:border-[#C6FF00]/40 group-hover:text-[#C6FF00]">
                    <Icon className="h-6 w-6" strokeWidth={1.75} aria-hidden />
                  </span>

                  <h3 className="rxr-display mt-5 text-xl leading-tight text-[#F7F6F3] sm:text-2xl">
                    {label}
                  </h3>
                  <p className="rxr-mono mt-2 text-[13px] leading-relaxed text-[#9aa0a6]">{note}</p>

                  {/* baseline accent rule that grows on hover */}
                  <span
                    aria-hidden
                    className="mt-6 block h-0.5 w-8 origin-left bg-[#C6FF00] transition-transform duration-200 group-hover:scale-x-[2.5]"
                  />
                </article>
              </Reveal>
            );
          })}
        </div>
      </div>

      {/* Inclusive closing line + CTA */}
      <Reveal delay={120}>
        <div className="mt-12 flex flex-col items-start gap-6 border-t border-white/10 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="rxr-display max-w-xl text-2xl leading-[0.98] text-[#F7F6F3] sm:text-3xl">
            Not sure where you fit? <span className="rxr-grad">You do.</span> Start with a free assessment.
          </p>
          <BookButton variant="primary" className="shrink-0">
            {CTA.label}
            <ArrowUpRight className="h-4 w-4" strokeWidth={2.25} aria-hidden />
          </BookButton>
        </div>
      </Reveal>
    </Section>
  );
}

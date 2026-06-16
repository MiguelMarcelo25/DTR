import { Activity, TrendingUp, Users, Route } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { RXR } from '../content';
import { Section, Heading, Stat } from './ui';
import { Reveal } from './Reveal';

/** One lucide glyph per differentiator, index-aligned with RXR.differentiators. */
const DIFF_ICONS: LucideIcon[] = [Activity, TrendingUp, Users, Route];

/**
 * Why Rise X Rehab — editorial "why us" section.
 * Intro summary + a 2-col differentiator grid (icon · title · body) beside a
 * framed supporting image, with the honest highlight stats running underneath.
 */
export function WhyUs() {
  return (
    <Section id="why" tone="dark" className="overflow-hidden">
      {/* ambient volt glow, decorative */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 top-10 h-72 w-72 rounded-full bg-[#C6FF00]/10 blur-3xl"
      />

      <div className="relative grid items-start gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
        {/* Left: heading + intro + differentiators */}
        <div>
          <Reveal>
            <Heading eyebrow="Why Rise X Rehab">
              Not just <span className="rxr-grad">recovery.</span>
              <br />
              A return to <span className="rxr-grad">stronger.</span>
            </Heading>
          </Reveal>

          <Reveal delay={80}>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-[#9aa0a6] sm:text-lg">
              {RXR.summary}
            </p>
          </Reveal>

          <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/5 sm:grid-cols-2">
            {RXR.differentiators.map((d, i) => {
              const Icon = DIFF_ICONS[i % DIFF_ICONS.length];
              return (
                <Reveal key={d.title} delay={i * 80}>
                  <div className="group flex h-full flex-col gap-3 bg-[#0B0C0E] p-6 transition-colors duration-200 hover:bg-[#111315] sm:p-7">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-[#111315] text-[#2EE6D6] transition-all duration-200 group-hover:border-[#C6FF00]/60 group-hover:text-[#C6FF00]">
                      <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                    </span>
                    <h3 className="rxr-display text-xl leading-none text-[#F7F6F3] sm:text-2xl">
                      {d.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-[#9aa0a6]">{d.body}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>

        {/* Right: framed supporting image */}
        <Reveal delay={120} className="lg:sticky lg:top-24">
          <figure className="relative">
            {/* volt corner accents */}
            <span
              aria-hidden
              className="absolute -left-2 -top-2 z-10 h-12 w-12 rounded-tl-2xl border-l-2 border-t-2 border-[#C6FF00]"
            />
            <span
              aria-hidden
              className="absolute -bottom-2 -right-2 z-10 h-12 w-12 rounded-br-2xl border-b-2 border-r-2 border-[#2EE6D6]"
            />
            <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-white/10 ring-1 ring-[#2EE6D6]/15 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.9)]">
              <img
                src={RXR.images.whyUs}
                alt="A physiotherapist guiding a client through coached rehabilitation training at Rise X Rehab in Quezon City"
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover transition-transform duration-500 ease-out hover:scale-105"
              />
              {/* dark overlay for legibility of caption */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0B0C0E] via-[#0B0C0E]/20 to-transparent" />
              <figcaption className="absolute inset-x-0 bottom-0 p-6">
                <span className="rxr-eyebrow text-[#C6FF00]">{RXR.tagline}</span>
                <p className="rxr-display mt-2 text-2xl leading-none text-[#F7F6F3] sm:text-3xl">
                  Rehab meets performance.
                </p>
              </figcaption>
            </div>
          </figure>
        </Reveal>
      </div>

      {/* Highlight stats */}
      <Reveal delay={160}>
        <div className="mt-16 grid grid-cols-2 gap-8 border-t border-white/10 pt-12 sm:gap-10 lg:grid-cols-4">
          {RXR.stats.map((s) => (
            <Stat key={s.label} value={s.value} label={s.label} />
          ))}
        </div>
      </Reveal>
    </Section>
  );
}

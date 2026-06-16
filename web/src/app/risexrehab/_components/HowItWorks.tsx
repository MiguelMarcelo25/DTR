import * as React from 'react';
import { ClipboardCheck, Target, Map, Dumbbell, Activity, ArrowRight } from 'lucide-react';
import { Section, Heading } from './ui';
import { Reveal } from './Reveal';
import { RXR } from '../content';

/**
 * HowItWorks — the 5-step RISE X REHAB method rendered as a connected stepper.
 * Mobile: a vertical spine with big volt step numbers running down the left rail.
 * Desktop: a staggered grid sitting on a horizontal progress spine.
 */

const STEP_ICONS = [ClipboardCheck, Target, Map, Dumbbell, Activity] as const;

export function HowItWorks() {
  const steps = RXR.howItWorks;
  const total = steps.length;

  return (
    <Section id="how" tone="dark" className="overflow-hidden">
      {/* Faint background texture — clinical/training imagery, kept low-opacity for legibility */}
      <div aria-hidden className="pointer-events-none absolute inset-0 select-none">
        <img
          src={RXR.images.howItWorks}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover opacity-[0.06]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0B0C0E] via-[#0B0C0E]/85 to-[#0B0C0E]" />
        {/* volt edge glow to anchor the section */}
        <div className="absolute -left-24 top-1/3 h-72 w-72 rounded-full bg-[#C6FF00]/[0.07] blur-[120px]" />
      </div>

      <div className="relative">
        <Reveal>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <Heading eyebrow="The method">
              How it <span className="rxr-grad">works</span>
            </Heading>
            <p className="max-w-sm text-pretty text-sm leading-relaxed text-[#9aa0a6] sm:text-right">
              Five deliberate stages — every move backed by your assessment data, never guesswork.
            </p>
          </div>
        </Reveal>

        {/* Stepper */}
        <ol className="relative mt-16 sm:mt-20">
          {/* Vertical spine (mobile + tablet) */}
          <span
            aria-hidden
            className="absolute left-[27px] top-3 bottom-3 w-px bg-gradient-to-b from-[#C6FF00] via-[#2EE6D6]/40 to-transparent lg:hidden"
          />

          <div className="grid gap-y-10 lg:grid-cols-5 lg:gap-x-5 lg:gap-y-0">
            {/* Horizontal spine (desktop) */}
            <span
              aria-hidden
              className="absolute left-0 right-0 top-[27px] hidden h-px bg-gradient-to-r from-[#C6FF00] via-[#2EE6D6]/40 to-transparent lg:block"
            />

            {steps.map((s, i) => {
              const Icon = STEP_ICONS[i] ?? Activity;
              const isLast = i === total - 1;
              return (
                <Reveal key={s.step} delay={i * 80}>
                  <li className="group relative pl-20 lg:pl-0">
                    {/* Step node — number disc on the spine */}
                    <div className="absolute left-0 top-0 lg:static lg:mb-7">
                      <div className="relative flex h-14 w-14 items-center justify-center rounded-full border border-white/12 bg-[#111315] shadow-[0_0_0_6px_#0B0C0E] transition-colors duration-200 group-hover:border-[#C6FF00]/60">
                        <span className="rxr-display text-2xl leading-none text-[#C6FF00]">{s.step}</span>
                      </div>
                    </div>

                    {/* Body card */}
                    <div className="relative h-full rounded-2xl border border-white/[0.07] bg-[#111315]/40 p-5 transition-all duration-200 group-hover:-translate-y-1 group-hover:border-white/15 group-hover:bg-[#111315]/70 lg:p-0 lg:rounded-none lg:border-0 lg:bg-transparent lg:group-hover:translate-y-0 lg:pr-5">
                      <div className="mb-3 flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-[#0B0C0E] text-[#2EE6D6] transition-colors duration-200 group-hover:border-[#2EE6D6]/40 group-hover:text-[#C6FF00]">
                          <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
                        </span>
                        <span className="rxr-mono text-[11px] uppercase tracking-[0.18em] text-[#9aa0a6]">
                          Stage {s.step}
                          <span className="text-white/25"> / {String(total).padStart(2, '0')}</span>
                        </span>
                      </div>

                      <h3 className="rxr-display text-balance text-2xl leading-[0.95] text-[#F7F6F3] sm:text-[1.7rem]">
                        {s.title}
                      </h3>
                      <p className="mt-3 text-sm leading-relaxed text-[#9aa0a6]">{s.body}</p>

                      {/* progress meter — reinforces the data-driven progression */}
                      <div className="mt-5 flex items-center gap-3">
                        <span aria-hidden className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.08]">
                          <span
                            className="block h-full rounded-full bg-gradient-to-r from-[#C6FF00] to-[#2EE6D6]"
                            style={{ width: `${((i + 1) / total) * 100}%` }}
                          />
                        </span>
                        <span className="rxr-mono text-[10px] tabular-nums tracking-wider text-white/30">
                          {Math.round(((i + 1) / total) * 100)}%
                        </span>
                      </div>

                      {!isLast && (
                        <ArrowRight
                          aria-hidden
                          className="absolute -bottom-9 left-[27px] h-5 w-5 rotate-90 text-[#C6FF00]/50 lg:bottom-auto lg:left-auto lg:right-[-22px] lg:top-[7px] lg:rotate-0"
                          strokeWidth={2}
                        />
                      )}
                    </div>
                  </li>
                </Reveal>
              );
            })}
          </div>
        </ol>

        <Reveal delay={total * 80}>
          <p className="rxr-mono mt-14 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[#9aa0a6]">
            <span className="h-px w-6 bg-[#2EE6D6]" />
            Reassessed against your own baseline — proof you came back stronger.
          </p>
        </Reveal>
      </div>
    </Section>
  );
}

import { Newspaper } from 'lucide-react';
import { Section, Eyebrow } from './ui';
import { Reveal } from './Reveal';
import { RXR } from '../content';

/**
 * Endorsers — trust / social-proof on a deliberate LIGHT break.
 * The clinic is brand-new, so there are NO client testimonials. We do not invent
 * any. Instead we present, honestly, the athletes/institutions that the press
 * reported as part of the launch, plus an "as featured in" strip of the outlets
 * that actually covered the opening. No "verified endorsement" claims.
 */
export function Endorsers() {
  // Each entry is "Name — Affiliation" (em-dash). Split safely.
  const supporters = RXR.endorsers.map((raw) => {
    const [name, ...rest] = raw.split('—');
    const affiliation = rest.join('—').trim();
    return { name: name.trim(), affiliation };
  });

  return (
    <Section tone="light" className="overflow-hidden">
      {/* faint structural ruling lines for depth on the light field */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{ backgroundImage: 'linear-gradient(#0B0C0E 1px, transparent 1px)', backgroundSize: '100% 56px' }}
      />

      <div className="relative">
        <Reveal>
          <div className="max-w-3xl">
            <Eyebrow tone="light">Recognized at launch</Eyebrow>
            <h2 className="rxr-display mt-4 text-balance text-4xl text-[#0B0C0E] sm:text-5xl lg:text-6xl">
              In good company from <span className="text-[#1B2A4A]">day one</span>.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-[#3a3f45] sm:text-lg">
              We’re new — so rather than testimonials we haven’t earned yet, here are the athletes and
              institutions the press reported as part of our launch.
            </p>
          </div>
        </Reveal>

        {/* Launch-supporter cards (no fabricated quotes or verification badges) */}
        <div className="mt-12 grid gap-4 sm:mt-16 sm:grid-cols-2">
          {supporters.map((e, i) => (
            <Reveal key={e.name} delay={i * 90}>
              <article className="group relative flex h-full flex-col justify-end overflow-hidden rounded-2xl border border-black/10 bg-white p-6 shadow-[0_1px_0_rgba(11,12,14,0.04)] transition-all duration-200 hover:-translate-y-1 hover:border-[#0B0C0E] hover:shadow-[0_24px_48px_-24px_rgba(11,12,14,0.45)] sm:p-7">
                {/* volt accent bar that grows on hover */}
                <span
                  aria-hidden
                  className="absolute left-0 top-0 h-1 w-12 bg-[#C6FF00] transition-all duration-200 group-hover:w-full"
                />
                <div className="rxr-mono text-[11px] uppercase tracking-[0.22em] text-black/55">At our launch</div>
                <h3 className="rxr-display mt-2 text-2xl leading-none text-[#0B0C0E] sm:text-[1.7rem]">{e.name}</h3>
                {e.affiliation && <p className="mt-3 text-sm font-medium text-[#3a3f45]">{e.affiliation}</p>}
              </article>
            </Reveal>
          ))}
        </div>

        {/* As featured in — press strip (these outlets covered the opening) */}
        <Reveal delay={120}>
          <div className="mt-14 rounded-2xl border border-black/10 bg-[#0B0C0E] px-6 py-7 text-[#F7F6F3] sm:mt-16 sm:px-9 sm:py-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-10">
              <div className="flex shrink-0 items-center gap-2.5">
                <Newspaper aria-hidden className="h-4 w-4 text-[#C6FF00]" strokeWidth={2} />
                <span className="rxr-eyebrow text-[#9aa0a6]">As featured in</span>
              </div>
              <ul className="flex flex-wrap items-center gap-x-8 gap-y-4 sm:gap-x-10">
                {RXR.press.map((pub) => (
                  <li
                    key={pub}
                    className="rxr-display text-lg uppercase tracking-wide text-[#F7F6F3]/70 transition-colors duration-200 hover:text-[#F7F6F3] sm:text-xl"
                  >
                    {pub}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}

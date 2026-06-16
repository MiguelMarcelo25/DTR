import { ShieldCheck, Users } from 'lucide-react';
import { Section, Heading, Chip } from './ui';
import { Reveal } from './Reveal';
import { RXR } from '../content';

/**
 * Founders & clinicians.
 * Real people — so we use styled INITIALS monogram avatars (no stock faces).
 * Honest clinical-team line is drawn verbatim-in-spirit from RXR.summary; no
 * fabricated credentials beyond the roles already in the content source.
 */
export function Founders() {
  return (
    <Section id="team" tone="dark" className="rxr-grain overflow-hidden">
      {/* Ambient brand glow behind the heading for depth */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 -z-0 h-72 w-[36rem] max-w-[90vw] -translate-x-1/2 rounded-full bg-[#2EE6D6]/10 blur-[120px]"
      />

      <div className="relative z-[2]">
        <Reveal>
          <Heading eyebrow="The team">
            Founders &amp; <span className="rxr-grad">clinicians</span>
          </Heading>
        </Reveal>

        {/* Honest clinical-team line, grounded in RXR.summary (no invented credentials) */}
        <Reveal delay={90}>
          <div className="mt-6 max-w-2xl">
            <p className="text-base leading-relaxed text-[#9aa0a6] sm:text-lg">
              Behind the brand is a clinical team of{' '}
              <span className="text-[#F7F6F3]">physiatrists, physiotherapists, and sports-science professionals</span>{' '}
              — pairing evidence-based rehabilitation with real performance training, so care is built on
              assessment data, not guesswork.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Chip>
                <ShieldCheck className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                Physio-led care
              </Chip>
              <Chip>
                <Users className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                Continuity from one team
              </Chip>
            </div>
          </div>
        </Reveal>

        {/* Founder cards */}
        <ul className="mt-12 grid grid-cols-1 gap-5 sm:mt-14 sm:grid-cols-2 lg:grid-cols-3">
          {RXR.founders.map((person, i) => (
            <li key={person.name}>
              <Reveal delay={i * 90}>
                <FounderCard {...person} />
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}

function FounderCard({ name, role, initials }: { name: string; role: string; initials: string }) {
  return (
    <article
      className="group relative flex h-full flex-col items-start gap-6 overflow-hidden rounded-2xl border border-white/10 bg-[#111315] p-6 transition-all duration-200 hover:-translate-y-1 hover:border-[#C6FF00]/40 hover:shadow-[0_24px_60px_-24px_rgba(198,255,0,0.25)] focus-within:border-[#C6FF00]/40 sm:p-7"
    >
      {/* Volt corner accent that strengthens on hover */}
      <span
        aria-hidden
        className="pointer-events-none absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-[#C6FF00]/10 blur-2xl transition-opacity duration-200 group-hover:opacity-100"
      />

      {/* Initials monogram avatar — NOT a photo */}
      <div className="relative">
        <div
          aria-hidden
          className="absolute inset-0 -z-0 rounded-2xl bg-gradient-to-br from-[#C6FF00] to-[#2EE6D6] opacity-30 blur-md transition-opacity duration-200 group-hover:opacity-60"
        />
        <div
          className="relative grid h-20 w-20 place-items-center rounded-2xl bg-gradient-to-br from-[#C6FF00] to-[#2EE6D6] ring-1 ring-inset ring-black/10"
          role="img"
          aria-label={`${name} monogram`}
        >
          <span className="rxr-display text-3xl leading-none text-[#0B0C0E]">{initials}</span>
        </div>
      </div>

      <div className="mt-auto">
        <h3 className="rxr-display text-2xl text-[#F7F6F3] sm:text-[1.7rem]">{name}</h3>
        <p className="rxr-mono mt-2 text-xs uppercase tracking-wider text-[#9aa0a6]">{role}</p>
      </div>

      {/* Baseline volt rule that grows on hover — tasteful motion via transform */}
      <span
        aria-hidden
        className="absolute bottom-0 left-0 h-[3px] w-12 origin-left bg-[#C6FF00] transition-transform duration-200 ease-out group-hover:scale-x-[6]"
      />
    </article>
  );
}

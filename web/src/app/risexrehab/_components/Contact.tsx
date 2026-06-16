import { Facebook, Instagram, MapPin, MessageCircle } from 'lucide-react';
import { RXR, CTA } from '../content';
import { CTAButton, Chip, Heading } from './ui';
import { Reveal } from './Reveal';
import { BookButton } from './booking/BookButton';

/**
 * Contact / Visit — split layout. Left: location + socials + Messenger-only
 * booking note (no public phone/email/hours exist yet, so none are shown).
 * Right: embedded Google Map. Stacks on mobile.
 */
export function Contact() {
  return (
    <section id="contact" className="relative bg-[#111315] text-[#F7F6F3]">
      {/* Volt hairline at the top edge for depth/separation */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#C6FF00]/40 to-transparent" />

      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 lg:grid-cols-2">
        {/* LEFT — info */}
        <div className="px-5 py-20 sm:px-8 sm:py-28 lg:pr-12">
          <Reveal>
            <Heading eyebrow="Visit / Book">
              Start your <span className="rxr-grad">comeback</span>
            </Heading>
          </Reveal>

          <Reveal delay={80}>
            <p className="mt-5 max-w-md text-base leading-relaxed text-[#9aa0a6]">
              Drop by the clinic in Sta. Mesa Heights, or book your free assessment online — we&rsquo;ll map
              the road from where you are now to stronger than before.
            </p>
          </Reveal>

          {/* Location */}
          <Reveal delay={140}>
            <div className="mt-10 flex items-start gap-4">
              <span
                aria-hidden="true"
                className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#C6FF00]/40 bg-[#C6FF00]/10 text-[#C6FF00]"
              >
                <MapPin className="h-5 w-5" />
              </span>
              <div>
                <div className="rxr-mono text-xs uppercase tracking-wider text-[#9aa0a6]">Find us</div>
                <a
                  href={RXR.contact.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 block max-w-xs rounded-sm text-base leading-relaxed text-[#F7F6F3] transition-colors hover:text-[#C6FF00] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6FF00] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111315]"
                >
                  {RXR.contact.location}
                </a>
              </div>
            </div>
          </Reveal>

          {/* Messenger-only booking note */}
          <Reveal delay={200}>
            <div className="mt-8 flex items-start gap-4 rounded-2xl border border-white/10 bg-[#0B0C0E]/60 p-5">
              <span
                aria-hidden="true"
                className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#2EE6D6]/40 bg-[#2EE6D6]/10 text-[#2EE6D6]"
              >
                <MessageCircle className="h-5 w-5" />
              </span>
              <div>
                <div className="rxr-mono text-xs uppercase tracking-wider text-[#9aa0a6]">How to book</div>
                <p className="mt-1 max-w-sm text-sm leading-relaxed text-[#F7F6F3]/85">
                  Hit <span className="font-semibold text-[#C6FF00]">Book a Free Assessment</span>, pick a date, time,
                  and coach, and we&rsquo;ll confirm your visit on{' '}
                  <span className="font-semibold text-[#2EE6D6]">Facebook Messenger</span>.
                </p>
              </div>
            </div>
          </Reveal>

          {/* Socials */}
          <Reveal delay={260}>
            <div className="mt-8">
              <div className="rxr-mono mb-3 text-xs uppercase tracking-wider text-[#9aa0a6]">Follow along</div>
              <div className="flex items-center gap-3">
                <a
                  href={RXR.contact.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Rise X Rehab on Facebook"
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 text-[#F7F6F3] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#C6FF00] hover:text-[#C6FF00] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6FF00] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111315]"
                >
                  <Facebook className="h-4 w-4" />
                </a>
                <a
                  href={RXR.contact.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Rise X Rehab on Instagram"
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 text-[#F7F6F3] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#C6FF00] hover:text-[#C6FF00] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6FF00] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111315]"
                >
                  <Instagram className="h-4 w-4" />
                </a>
                <Chip className="ml-1">@risexrehab</Chip>
              </div>
            </div>
          </Reveal>

          {/* CTAs */}
          <Reveal delay={320}>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <BookButton variant="primary">{CTA.label}</BookButton>
              <CTAButton href={RXR.contact.facebook} target="_blank" rel="noopener noreferrer" variant="ghost">
                <MessageCircle className="h-4 w-4" />
                Message on Facebook
              </CTAButton>
            </div>
          </Reveal>
        </div>

        {/* RIGHT — map */}
        <Reveal delay={120} className="min-h-[320px] lg:min-h-0">
          <div className="relative h-full min-h-[320px] overflow-hidden border-t border-white/10 lg:border-l lg:border-t-0">
            {/* Subtle volt glow framing the embed */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 z-10 rounded-none ring-1 ring-inset ring-[#C6FF00]/10"
            />
            <iframe
              title={`Map to ${RXR.name} in Sta. Mesa Heights, Quezon City`}
              src={RXR.contact.mapsEmbed}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="h-[320px] w-full rounded-none border-0 grayscale-[0.2] contrast-110 sm:h-full"
            />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

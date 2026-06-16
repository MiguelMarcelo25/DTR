import { ArrowUpRight } from 'lucide-react';

import { RXR } from '../content';
import { Reveal } from './Reveal';
import { Chip, Heading, Section } from './ui';

/**
 * Services & Programs — a responsive (1/2/3 col) grid of premium service cards.
 * Each card: lazy image with a dark legibility gradient, a tag Chip, a bold
 * display title, and muted supporting copy. Hover lifts the card, zooms the
 * image, and shifts the border toward the teal/volt accents.
 */
export function Services() {
  return (
    <Section id="services" tone="panel" className="overflow-hidden">
      <Reveal>
        <Heading eyebrow="What we do">
          Services &amp; <span className="rxr-grad">Programs</span>
        </Heading>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-[#9aa0a6] sm:text-lg">
          One clinical team, one continuum — from injury and pain through recovery and back to peak
          performance. Every program is built on assessment data, not guesswork.
        </p>
      </Reveal>

      <ul className="mt-12 grid grid-cols-1 gap-5 sm:mt-14 sm:grid-cols-2 lg:grid-cols-3">
        {RXR.services.map((service, i) => (
          <li key={service.name}>
            <Reveal delay={i * 70}>
              <article
                className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0B0C0E] transition-all duration-200 hover:-translate-y-1.5 hover:border-[#2EE6D6]/60 hover:shadow-[0_24px_60px_-24px_rgba(46,230,214,0.45)]"
              >
                {/* Media */}
                <div className="relative h-44 w-full overflow-hidden">
                  <img
                    src={service.image}
                    alt={service.name}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-[450ms] ease-out group-hover:scale-105 group-focus-visible:scale-105"
                  />
                  {/* Dark gradient for legibility + atmosphere */}
                  <div
                    aria-hidden
                    className="absolute inset-0 bg-gradient-to-t from-[#0B0C0E] via-[#0B0C0E]/55 to-transparent"
                  />
                  {/* Tag over the image */}
                  <div className="absolute left-4 top-4">
                    <Chip className="bg-black/45 backdrop-blur-sm">{service.tag}</Chip>
                  </div>
                  {/* Index numeral */}
                  <span className="rxr-display absolute bottom-3 right-4 text-2xl leading-none text-white/15 transition-colors duration-200 group-hover:text-[#C6FF00]/40">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </div>

                {/* Body */}
                <div className="flex flex-1 flex-col gap-3 p-6">
                  <h3 className="rxr-display text-xl leading-tight text-[#F7F6F3] transition-colors duration-200 group-hover:text-[#2EE6D6] sm:text-2xl">
                    {service.name}
                  </h3>
                  <p className="text-sm leading-relaxed text-[#9aa0a6]">{service.body}</p>
                  <span className="mt-auto inline-flex items-center gap-1.5 pt-2 text-[#C6FF00] opacity-0 transition-all duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
                    <span className="rxr-mono text-[11px] uppercase tracking-wider">Learn more</span>
                    <ArrowUpRight
                      aria-hidden
                      className="h-4 w-4 -translate-x-1 transition-transform duration-200 group-hover:translate-x-0"
                    />
                  </span>
                </div>

                {/* Volt baseline that grows on hover */}
                <span
                  aria-hidden
                  className="absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 bg-gradient-to-r from-[#C6FF00] to-[#2EE6D6] transition-transform duration-300 group-hover:scale-x-100 group-focus-visible:scale-x-100"
                />
              </article>
            </Reveal>
          </li>
        ))}
      </ul>
    </Section>
  );
}

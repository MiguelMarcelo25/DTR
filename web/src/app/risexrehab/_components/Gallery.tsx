import { Section, Heading, Chip } from './ui';
import { Reveal } from './Reveal';
import { RXR } from '../content';
import { ArrowUpRight, Dumbbell } from 'lucide-react';

/**
 * Gallery — a polished mosaic of the facility. A varied-span grid (two tiles
 * span 2 columns/rows) gives an editorial, high-end rhythm. Each tile has a
 * subtle hover zoom, a thin border, a dark gradient scrim, and a quiet caption.
 */

type Tile = {
  src: string;
  alt: string;
  caption: string;
  /** Tailwind span classes applied on the lg grid. */
  span: string;
};

// Representative imagery (stock placeholders) — alt text describes the type of
// space, not a claim that it is this specific clinic, until real photos are added.
const TILES: Tile[] = [
  {
    src: RXR.gallery[0],
    alt: 'Spacious training floor with rubber flooring and modern strength equipment under directional lighting',
    caption: 'The performance floor',
    span: 'lg:col-span-2 lg:row-span-2',
  },
  {
    src: RXR.gallery[1],
    alt: 'Racked dumbbells and free weights neatly organized along a wall in a strength-training area',
    caption: 'Strength & loading',
    span: 'lg:col-span-1 lg:row-span-1',
  },
  {
    src: RXR.gallery[2],
    alt: 'Clean clinical treatment bay used for hands-on physical therapy and assessment',
    caption: 'Clinical treatment bay',
    span: 'lg:col-span-1 lg:row-span-1',
  },
  {
    src: RXR.gallery[3],
    alt: 'Athlete training on a cable resistance machine in a bright conditioning space',
    caption: 'Resistance & conditioning',
    span: 'lg:col-span-2 lg:row-span-1',
  },
  {
    src: RXR.gallery[4],
    alt: 'Recovery and mobility zone with open matted space for rehab drills and stretching',
    caption: 'Recovery & mobility zone',
    span: 'lg:col-span-1 lg:row-span-1',
  },
  {
    src: RXR.gallery[5],
    alt: 'Detail of premium rehabilitation and recovery equipment in a performance-clinic environment',
    caption: 'Premium equipment',
    span: 'lg:col-span-1 lg:row-span-1',
  },
];

export function Gallery() {
  return (
    <Section tone="dark" className="rxr-grain overflow-hidden">
      <div className="relative z-[2]">
        <Reveal>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <Heading eyebrow="The space">
              Inside the <span className="rxr-grad">facility</span>
            </Heading>
            <p className="max-w-md text-sm leading-relaxed text-[#9aa0a6] sm:text-base">
              Premium training and recovery equipment in a clean, clinical-grade
              performance space — engineered so every session, from assessment to
              return-to-sport, happens in one purpose-built environment.
            </p>
          </div>
        </Reveal>

        <Reveal delay={80}>
          <div className="mt-10 grid auto-rows-[200px] grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:auto-rows-[180px] lg:grid-cols-4">
            {TILES.map((tile, i) => (
              <figure
                key={tile.src}
                className={[
                  'group relative overflow-hidden rounded-2xl border border-white/10',
                  'bg-[#111315] shadow-[0_24px_60px_-30px_rgba(0,0,0,0.9)]',
                  'transition-colors duration-200 hover:border-[#C6FF00]/40',
                  'focus-within:border-[#C6FF00]/60',
                  tile.span,
                ].join(' ')}
              >
                <img
                  src={tile.src}
                  alt={tile.alt}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover transition-transform duration-[450ms] ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform group-hover:scale-[1.06]"
                />

                {/* Legibility scrim — darker at the base where the caption sits. */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0B0C0E] via-[#0B0C0E]/20 to-transparent opacity-80 transition-opacity duration-200 group-hover:opacity-95"
                />

                {/* Volt index marker */}
                <span className="rxr-mono pointer-events-none absolute left-4 top-4 text-[11px] font-bold uppercase tracking-[0.2em] text-[#C6FF00]/80">
                  {String(i + 1).padStart(2, '0')}
                </span>

                <figcaption className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 p-4">
                  <span className="rxr-mono text-xs uppercase tracking-[0.14em] text-[#F7F6F3]">
                    {tile.caption}
                  </span>
                  <span
                    aria-hidden="true"
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-white/20 text-[#F7F6F3] opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:border-[#C6FF00] group-hover:text-[#C6FF00] group-hover:opacity-100 sm:-translate-x-1"
                  >
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        </Reveal>

        <Reveal delay={160}>
          <div className="mt-8 flex items-center gap-3">
            <Chip className="gap-2 !text-[#C6FF00]">
              <Dumbbell className="h-3.5 w-3.5" aria-hidden="true" />
              Built for performance
            </Chip>
            <p className="rxr-mono text-xs uppercase tracking-[0.14em] text-[#9aa0a6]">
              Sta. Mesa Heights · Quezon City
            </p>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}

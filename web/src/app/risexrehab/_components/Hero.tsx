import { ArrowDown, ArrowUpRight } from 'lucide-react';
import { RXR, CTA } from '../content';
import { CTAButton, Eyebrow } from './ui';
import { BookButton } from './booking/BookButton';

/**
 * Cinematic, full-viewport hero. Full-bleed background image sits behind a
 * layered dark scrim (left-to-right + bottom) so the type stays legible, with a
 * staggered entrance using the globally-available `animate-fade-up` keyframes.
 */
export function Hero() {
  // Stagger the entrance — eyebrow → each headline word → subhead → CTAs → cue.
  const words = RXR.heroHeadline;
  const wordBaseDelay = 120;
  const wordStep = 110;
  const lastWordDelay = wordBaseDelay + (words.length - 1) * wordStep;

  return (
    <section
      id="top"
      className="rxr-grain relative isolate flex min-h-screen flex-col justify-end overflow-hidden bg-[#0B0C0E] pb-16 pt-28 sm:pb-20 sm:pt-32"
    >
      {/* Full-bleed background image */}
      <img
        src={RXR.images.hero}
        alt="Athlete training under dramatic light inside a modern strength and conditioning gym"
        loading="eager"
        decoding="async"
        className="absolute inset-0 -z-10 h-full w-full object-cover object-center"
      />

      {/* Layered scrims for legibility: left→right, bottom→up, and a base tint */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-r from-[#0B0C0E] via-[#0B0C0E]/80 to-[#0B0C0E]/30"
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-t from-[#0B0C0E] via-[#0B0C0E]/55 to-transparent"
      />
      {/* Volt edge glow at the base for an athletic, charged feel */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 -z-10 h-px bg-gradient-to-r from-transparent via-[#C6FF00]/60 to-transparent"
      />

      <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
        <div className="max-w-3xl">
          {/* Eyebrow — opened note */}
          <div className="animate-fade-up" style={{ animationDelay: '40ms' }}>
            <Eyebrow>{RXR.openedNote}</Eyebrow>
          </div>

          {/* Massive stacked display headline */}
          <h1 className="rxr-display mt-6 text-balance text-[clamp(3.25rem,13vw,9rem)] leading-[0.88] text-[#F7F6F3]">
            {words.map((word, i) => {
              // Make the middle word the volt→teal gradient accent.
              const isAccent = i === 1;
              return (
                <span
                  key={word}
                  className="block animate-fade-up"
                  style={{ animationDelay: `${wordBaseDelay + i * wordStep}ms` }}
                >
                  <span className={isAccent ? 'rxr-grad' : undefined}>{word}</span>
                </span>
              );
            })}
          </h1>

          {/* Subhead */}
          <p
            className="animate-fade-up mt-7 max-w-xl text-base leading-relaxed text-[#F7F6F3]/80 sm:text-lg"
            style={{ animationDelay: `${lastWordDelay + 120}ms` }}
          >
            {RXR.heroSubhead}
          </p>

          {/* CTAs */}
          <div
            className="animate-fade-up mt-9 flex flex-col gap-3 sm:flex-row sm:items-center"
            style={{ animationDelay: `${lastWordDelay + 240}ms` }}
          >
            <BookButton variant="primary">
              {CTA.label}
              <ArrowUpRight className="h-4 w-4" aria-hidden />
            </BookButton>
            <CTAButton href="#services" variant="ghost">
              Explore services
            </CTAButton>
          </div>
        </div>
      </div>

      {/* Scroll cue */}
      <a
        href="#services"
        aria-label="Scroll to services"
        className="animate-fade-in group absolute inset-x-0 bottom-6 mx-auto hidden w-fit flex-col items-center gap-2 rounded-full px-3 py-1 text-[#9aa0a6] transition-colors duration-200 hover:text-[#C6FF00] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6FF00] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0C0E] sm:flex"
        style={{ animationDelay: `${lastWordDelay + 480}ms` }}
      >
        <span className="rxr-eyebrow text-[0.62rem]">Scroll</span>
        <ArrowDown className="h-4 w-4 animate-bounce" aria-hidden />
      </a>
    </section>
  );
}

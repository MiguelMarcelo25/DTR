import { RXR, CTA } from '../content';
import { BookButton } from './booking/BookButton';

/** Full-width conversion band anchored by the free-assessment CTA. */
export function CtaBand() {
  return (
    <section className="relative overflow-hidden bg-[#C6FF00] px-5 py-20 text-[#0B0C0E] sm:px-8 sm:py-24">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-4">
          <span className="rxr-eyebrow inline-flex items-center gap-2 text-[#0B0C0E]/70">
            <span className="h-px w-6 bg-[#0B0C0E]" />
            {RXR.openedNote}
          </span>
          <h2 className="rxr-display max-w-2xl text-4xl sm:text-5xl lg:text-6xl">
            Your comeback starts with one assessment.
          </h2>
          <p className="max-w-xl text-[#0B0C0E]/75">
            Book a free assessment and we’ll build the roadmap — from where you are now to stronger than before.
          </p>
        </div>
        <BookButton variant="light" className="shrink-0">
          {CTA.label}
        </BookButton>
      </div>
    </section>
  );
}

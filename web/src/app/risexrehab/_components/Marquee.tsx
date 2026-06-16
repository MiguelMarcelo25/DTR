import { RXR } from '../content';

/** Infinite scrolling tagline strip — RISE · REBUILD · RESTORE. */
export function Marquee() {
  const items = Array.from({ length: 8 }, () => RXR.heroHeadline).flat();
  return (
    <div className="relative overflow-hidden border-y border-white/10 bg-[#111315] py-5">
      <div className="rxr-marquee" aria-hidden="true">
        {[0, 1].map((dup) => (
          <div key={dup} className="flex shrink-0 items-center">
            {items.map((word, i) => (
              <span key={`${dup}-${i}`} className="flex items-center">
                <span className="rxr-display px-6 text-2xl text-[#F7F6F3] sm:text-3xl">{word}</span>
                <span className="text-[#C6FF00]">✕</span>
              </span>
            ))}
          </div>
        ))}
      </div>
      <span className="sr-only">{RXR.tagline}</span>
    </div>
  );
}

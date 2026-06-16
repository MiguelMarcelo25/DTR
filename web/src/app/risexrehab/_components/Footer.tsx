import { Facebook, Instagram } from 'lucide-react';
import { RXR, CTA } from '../content';
import { BookButton } from './booking/BookButton';

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#0B0C0E] px-5 py-14 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-10 lg:flex-row lg:justify-between">
          <div className="max-w-sm space-y-4">
            <a href="#top" className="rxr-display text-2xl text-[#F7F6F3]">
              RISE<span className="text-[#C6FF00]">X</span>REHAB
            </a>
            <p className="text-sm text-[#9aa0a6]">{RXR.tagline} — premium physical therapy, sports rehab & recovery in Quezon City.</p>
            <div className="flex items-center gap-3">
              <a
                href={RXR.contact.facebook}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Rise X Rehab on Facebook"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-[#F7F6F3] transition-colors hover:border-[#C6FF00] hover:text-[#C6FF00]"
              >
                <Facebook className="h-4 w-4" />
              </a>
              <a
                href={RXR.contact.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Rise X Rehab on Instagram"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-[#F7F6F3] transition-colors hover:border-[#C6FF00] hover:text-[#C6FF00]"
              >
                <Instagram className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:gap-16">
            <div>
              <div className="rxr-mono mb-4 text-xs uppercase tracking-wider text-[#9aa0a6]">Explore</div>
              <ul className="space-y-2.5">
                {RXR.nav.map((n) => (
                  <li key={n.href}>
                    <a href={n.href} className="text-sm text-[#F7F6F3]/80 transition-colors hover:text-[#C6FF00]">
                      {n.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="rxr-mono mb-4 text-xs uppercase tracking-wider text-[#9aa0a6]">Visit</div>
              <p className="max-w-[16rem] text-sm leading-relaxed text-[#F7F6F3]/80">{RXR.contact.location}</p>
              <BookButton
                unstyled
                className="mt-4 inline-flex cursor-pointer items-center rounded-full bg-[#C6FF00] px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-black transition-all hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6FF00]"
              >
                {CTA.label}
              </BookButton>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-[#9aa0a6] sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {RXR.name}. All rights reserved.</p>
          <p className="rxr-mono">{RXR.tagline}</p>
        </div>
      </div>
    </footer>
  );
}

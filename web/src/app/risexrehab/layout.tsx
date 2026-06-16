import type { Metadata } from 'next';
import { Anton, Manrope, JetBrains_Mono } from 'next/font/google';
import './rxr.css';

// Athletic, distinctive type system — Anton (display) + Manrope (body) + JetBrains Mono (labels/numerals).
const display = Anton({ subsets: ['latin'], weight: '400', variable: '--font-rxr-display', display: 'swap' });
const body = Manrope({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], variable: '--font-rxr-body', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500', '700'], variable: '--font-rxr-mono', display: 'swap' });

export const metadata: Metadata = {
  title: 'Rise X Rehab — Rise. Rebuild. Restore.',
  description:
    'Premium physical therapy, sports rehabilitation & recovery clinic in Quezon City. Physio-led, science-driven care that bridges rehab and performance — for athletes, everyday people, seniors, and kids.',
  openGraph: {
    title: 'Rise X Rehab — Rise. Rebuild. Restore.',
    description:
      'Premium physical therapy & sports rehabilitation clinic in Quezon City. Science-driven care from rehab to performance.',
    type: 'website',
  },
};

export default function RiseXRehabLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`rxr ${display.variable} ${body.variable} ${mono.variable} min-h-screen overflow-x-hidden antialiased`}
    >
      {/* If JS is disabled, scroll-reveal can't run — keep all content visible. */}
      <noscript>
        <style>{`.rxr-reveal{opacity:1 !important;transform:none !important}`}</style>
      </noscript>
      {children}
    </div>
  );
}

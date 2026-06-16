import * as React from 'react';

function cx(...c: Array<string | false | undefined>) {
  return c.filter(Boolean).join(' ');
}

/** Mono uppercase eyebrow label with a tick. Tone-aware so it stays AA-legible
 *  on both dark and light section backgrounds. */
export function Eyebrow({
  children,
  className,
  tone = 'dark',
}: {
  children: React.ReactNode;
  className?: string;
  tone?: 'dark' | 'light';
}) {
  const color = tone === 'light' ? 'text-[#3a3f45]' : 'text-[#9aa0a6]';
  const tick = tone === 'light' ? 'bg-[#1B2A4A]' : 'bg-[#C6FF00]';
  return (
    <span className={cx('rxr-eyebrow inline-flex items-center gap-2', color, className)}>
      <span className={cx('h-px w-6', tick)} />
      {children}
    </span>
  );
}

/** Section wrapper with consistent rhythm + max width. Pass `dark`/`light`/`panel` tone. */
export function Section({
  id,
  tone = 'dark',
  className,
  children,
}: {
  id?: string;
  tone?: 'dark' | 'panel' | 'light';
  className?: string;
  children: React.ReactNode;
}) {
  const toneCls =
    tone === 'light'
      ? 'bg-[#F7F6F3] text-[#0B0C0E]'
      : tone === 'panel'
        ? 'bg-[#111315] text-[#F7F6F3]'
        : 'bg-[#0B0C0E] text-[#F7F6F3]';
  return (
    <section id={id} className={cx('relative px-5 py-20 sm:px-8 sm:py-28', toneCls, className)}>
      <div className="mx-auto w-full max-w-6xl">{children}</div>
    </section>
  );
}

/** Big display heading; optional eyebrow above. Children may include <span className="rxr-grad"> accents. */
export function Heading({
  eyebrow,
  children,
  className,
  as = 'h2',
}: {
  eyebrow?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  as?: 'h1' | 'h2' | 'h3';
}) {
  const Tag = as;
  return (
    <div className="space-y-4">
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <Tag className={cx('rxr-display text-balance text-4xl sm:text-5xl lg:text-6xl', className)}>{children}</Tag>
    </div>
  );
}

/** Primary (volt) or ghost CTA rendered as an anchor. */
export function CTAButton({
  href,
  children,
  variant = 'primary',
  className,
  ...rest
}: {
  href: string;
  children: React.ReactNode;
  variant?: 'primary' | 'ghost' | 'light';
  className?: string;
} & React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-sm font-bold uppercase tracking-wide transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6FF00] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0C0E]';
  const variants = {
    primary: 'bg-[#C6FF00] text-black hover:brightness-110 hover:shadow-[0_0_40px_-8px_#C6FF00]',
    ghost: 'border border-white/25 text-[#F7F6F3] hover:border-[#C6FF00] hover:text-[#C6FF00]',
    light: 'bg-[#0B0C0E] text-[#F7F6F3] hover:bg-black',
  } as const;
  return (
    <a href={href} className={cx(base, variants[variant], className)} {...rest}>
      {children}
    </a>
  );
}

/** Stat / highlight tile. */
export function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="border-l-2 border-[#C6FF00] pl-4">
      <div className="rxr-display text-3xl text-[#F7F6F3] sm:text-4xl">{value}</div>
      <div className="rxr-mono mt-1 text-xs uppercase tracking-wider text-[#9aa0a6]">{label}</div>
    </div>
  );
}

/** Small pill/tag. */
export function Chip({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cx(
        'rxr-mono inline-flex items-center rounded-full border border-white/15 px-3 py-1 text-[11px] uppercase tracking-wider text-[#2EE6D6]',
        className,
      )}
    >
      {children}
    </span>
  );
}

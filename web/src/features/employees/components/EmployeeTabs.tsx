'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const TABS = [
  { key: '', label: 'Overview' },
  { key: 'profile', label: 'Profile' },
  { key: 'employment', label: 'Employment' },
  { key: 'background', label: 'Background' },
  { key: 'documents', label: 'Documents' },
  { key: 'timeline', label: 'Timeline' },
] as const;

/** Horizontal sub-navigation for the employee detail sub-pages. */
export function EmployeeTabs({ employeeId }: { employeeId: string }) {
  const pathname = usePathname();
  const base = `/dashboard/employees/${employeeId}`;

  return (
    <div className="mb-6 border-b">
      <nav className="-mb-px flex flex-wrap gap-1">
        {TABS.map((t) => {
          const href = t.key ? `${base}/${t.key}` : base;
          const active = t.key
            ? pathname.startsWith(href)
            : pathname === base || pathname === `${base}/`;
          return (
            <Link
              key={t.key || 'overview'}
              href={href}
              className={cn(
                'border-b-2 px-4 py-2 text-sm font-medium transition-colors',
                active
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground',
              )}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

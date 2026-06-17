'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  CalendarClock,
  CalendarDays,
  Plane,
  Wallet,
  FileBarChart,
  LifeBuoy,
  UserCircle,
  Settings,
  Building2,
  Briefcase,
  ClipboardCheck,
  ClipboardList,
  ScrollText,
  ShieldCheck,
  ChevronDown,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/AuthProvider';
import { ADMINS, PRIVILEGED, STAFF } from '@/lib/constants';
import type { RoleName } from '@/types';

interface NavChild {
  label: string;
  href: string;
  roles?: RoleName[];
}

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  roles?: RoleName[];
  children?: NavChild[];
}

interface NavGroup {
  title?: string;
  items: NavItem[];
}

const NAV: NavGroup[] = [
  {
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { label: 'My Profile', href: '/dashboard/profile', icon: UserCircle },
    ],
  },
  {
    title: 'Workforce',
    items: [
      { label: 'Employees', href: '/dashboard/employees', icon: Users, roles: PRIVILEGED },
      {
        label: 'Attendance',
        href: '/dashboard/attendance',
        icon: CalendarClock,
        children: [
          { label: 'Time Clock', href: '/dashboard/attendance' },
          { label: 'History', href: '/dashboard/attendance/history' },
          { label: 'Monthly DTR', href: '/dashboard/attendance/monthly-dtr' },
          { label: 'Corrections', href: '/dashboard/attendance/corrections' },
          { label: 'Overtime', href: '/dashboard/overtime' },
          { label: 'Reports', href: '/dashboard/attendance/reports', roles: PRIVILEGED },
        ],
      },
      { label: 'Leave', href: '/dashboard/leave', icon: Plane },
      { label: 'Appointments', href: '/dashboard/appointments', icon: CalendarDays },
      { label: 'Approvals', href: '/dashboard/approvals', icon: ClipboardCheck, roles: STAFF },
      { label: 'Payroll', href: '/dashboard/payroll', icon: Wallet },
      { label: 'Support', href: '/dashboard/support', icon: LifeBuoy },
      { label: 'Reports', href: '/dashboard/reports', icon: FileBarChart, roles: PRIVILEGED },
    ],
  },
  {
    title: 'Administration',
    items: [
      { label: 'Users', href: '/dashboard/admin/users', icon: ShieldCheck, roles: ADMINS },
      { label: 'Departments', href: '/dashboard/admin/departments', icon: Building2, roles: ADMINS },
      { label: 'Positions', href: '/dashboard/admin/positions', icon: Briefcase, roles: ADMINS },
      { label: 'Schedules', href: '/dashboard/admin/schedules', icon: ClipboardList, roles: ADMINS },
      { label: 'Holidays', href: '/dashboard/admin/holidays', icon: CalendarDays, roles: ADMINS },
      { label: 'Audit Logs', href: '/dashboard/admin/audit-logs', icon: ScrollText, roles: PRIVILEGED },
      { label: 'Settings', href: '/dashboard/admin/settings', icon: Settings, roles: ADMINS },
    ],
  },
];

export function Sidebar({ collapsed = false, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const roles = user?.roles ?? [];
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const canSee = (item: { roles?: RoleName[] }) =>
    !item.roles || item.roles.some((r) => roles.includes(r));

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  const branchActive = (base: string) => pathname === base || pathname.startsWith(`${base}/`);
  const isMenuOpen = (item: NavItem) => open[item.label] ?? branchActive(item.href);

  const itemClasses = (active: boolean) =>
    cn(
      'group flex items-center gap-3 rounded-lg py-2 text-sm font-medium transition-colors duration-200',
      collapsed ? 'justify-center px-0' : 'px-3',
      active
        ? 'bg-sidebar-active text-sidebar-active-foreground shadow-soft'
        : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-white',
    );
  const iconClasses = (active: boolean) =>
    cn('h-[18px] w-[18px] shrink-0', active ? 'text-sidebar-active-foreground' : 'text-sidebar-muted group-hover:text-white');

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      {/* Brand */}
      <div
        className={cn(
          'flex h-16 shrink-0 items-center gap-2.5 border-b border-sidebar-border',
          collapsed ? 'justify-center px-0' : 'px-5',
        )}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-active text-sidebar-active-foreground shadow-soft">
          <Building2 className="h-5 w-5" />
        </span>
        {!collapsed && (
          <div className="leading-tight">
            <p className="font-display text-sm font-bold text-white">HRMS</p>
            <p className="text-[11px] text-sidebar-muted">Human Resources</p>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto overflow-x-hidden scrollbar-none px-3 py-5">
        {NAV.map((group, gi) => {
          const items = group.items.filter(canSee);
          if (!items.length) return null;
          return (
            <div key={gi} className="space-y-1">
              {group.title && !collapsed && (
                <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-muted">
                  {group.title}
                </p>
              )}
              {items.map((item) => {
                const Icon = item.icon;

                // ── Submenu ──
                if (item.children) {
                  const parentActive = branchActive(item.href);

                  // Collapsed rail: just the icon, linking to the section root.
                  if (collapsed) {
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onNavigate}
                        title={item.label}
                        className={itemClasses(parentActive)}
                      >
                        <Icon className={iconClasses(parentActive)} />
                      </Link>
                    );
                  }

                  const children = item.children.filter(canSee);
                  const opened = isMenuOpen(item);
                  return (
                    <div key={item.href}>
                      <button
                        type="button"
                        aria-expanded={opened}
                        onClick={() => setOpen((o) => ({ ...o, [item.label]: !opened }))}
                        className={cn(itemClasses(false), 'w-full', parentActive && 'text-white')}
                      >
                        <Icon className={iconClasses(false)} />
                        <span className="flex-1 text-left">{item.label}</span>
                        <ChevronDown className={cn('h-4 w-4 text-sidebar-muted transition-transform', opened && 'rotate-180')} />
                      </button>
                      {opened && (
                        <div className="mt-1 space-y-0.5 pl-[34px]">
                          {children.map((c) => {
                            const active = pathname === c.href;
                            return (
                              <Link
                                key={c.href}
                                href={c.href}
                                onClick={onNavigate}
                                aria-current={active ? 'page' : undefined}
                                className={cn(
                                  'block rounded-md px-3 py-1.5 text-sm transition-colors duration-200',
                                  active
                                    ? 'bg-sidebar-active text-sidebar-active-foreground'
                                    : 'text-sidebar-muted hover:bg-sidebar-accent hover:text-white',
                                )}
                              >
                                {c.label}
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }

                // ── Flat link ──
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    title={collapsed ? item.label : undefined}
                    aria-current={active ? 'page' : undefined}
                    className={itemClasses(active)}
                  >
                    <Icon className={iconClasses(active)} />
                    {!collapsed && item.label}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="shrink-0 border-t border-sidebar-border px-5 py-3 text-[11px] text-sidebar-muted">
          © {new Date().getFullYear()} HRMS
        </div>
      )}
    </div>
  );
}

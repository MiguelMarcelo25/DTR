'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  ClipboardList,
  ScrollText,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/AuthProvider';
import { ADMINS, PRIVILEGED } from '@/lib/constants';
import type { RoleName } from '@/types';

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  roles?: RoleName[];
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
      { label: 'Attendance', href: '/dashboard/attendance', icon: CalendarClock },
      { label: 'Leave', href: '/dashboard/leave', icon: Plane },
      { label: 'Appointments', href: '/dashboard/appointments', icon: CalendarDays },
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
      { label: 'Audit Logs', href: '/dashboard/admin/audit-logs', icon: ScrollText, roles: PRIVILEGED },
      { label: 'Settings', href: '/dashboard/admin/settings', icon: Settings, roles: ADMINS },
    ],
  },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const roles = user?.roles ?? [];

  const canSee = (item: NavItem) => !item.roles || item.roles.some((r) => roles.includes(r));

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      {/* Brand */}
      <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-sidebar-border px-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-active text-sidebar-active-foreground shadow-soft">
          <Building2 className="h-5 w-5" />
        </span>
        <div className="leading-tight">
          <p className="font-display text-sm font-bold text-white">HRMS</p>
          <p className="text-[11px] text-sidebar-muted">Human Resources</p>
        </div>
      </div>

      {/* Nav — scrolls with NO visible scrollbar */}
      <nav className="flex-1 space-y-6 overflow-y-auto scrollbar-none px-3 py-5">
        {NAV.map((group, gi) => {
          const items = group.items.filter(canSee);
          if (!items.length) return null;
          return (
            <div key={gi} className="space-y-1">
              {group.title && (
                <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-muted">
                  {group.title}
                </p>
              )}
              {items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200',
                      active
                        ? 'bg-sidebar-active text-sidebar-active-foreground shadow-soft'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-white',
                    )}
                  >
                    <Icon className={cn('h-[18px] w-[18px] shrink-0', active ? 'text-sidebar-active-foreground' : 'text-sidebar-muted group-hover:text-white')} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      <div className="shrink-0 border-t border-sidebar-border px-5 py-3 text-[11px] text-sidebar-muted">
        © {new Date().getFullYear()} HRMS
      </div>
    </div>
  );
}

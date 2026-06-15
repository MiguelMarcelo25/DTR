'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogOut, Menu, KeyRound, UserCircle, ChevronDown } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { ROLE_LABELS } from '@/lib/constants';
import { initials } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ThemeToggle } from './ThemeToggle';
import { NotificationBell } from './NotificationBell';

export function Topbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const { user, logout } = useAuth();
  const router = useRouter();

  const label = user?.email?.split('@')[0] ?? 'User';
  const roleLabel = user?.roles?.[0] ? ROLE_LABELS[user.roles[0]] : '';

  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

  return (
    <header className="glass sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-3 border-b px-4 sm:px-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick} aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        <NotificationBell />
        <ThemeToggle />
        <div className="mx-1 hidden h-6 w-px bg-border sm:block" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-auto gap-2 px-1.5 py-1.5 hover:bg-accent">
              <Avatar className="h-8 w-8 ring-2 ring-background">
                <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
                  {initials(label)}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-left sm:block">
                <span className="block text-sm font-semibold leading-none">{label}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{roleLabel}</span>
              </span>
              <ChevronDown className="hidden h-4 w-4 text-muted-foreground sm:block" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60 shadow-pop">
            <DropdownMenuLabel className="flex flex-col gap-1">
              <span className="truncate text-sm">{user?.email}</span>
              <Badge variant="secondary" className="w-fit text-[10px]">{roleLabel}</Badge>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard/profile">
                <UserCircle className="h-4 w-4" /> My Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/profile/change-password">
                <KeyRound className="h-4 w-4" /> Change password
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
              <LogOut className="h-4 w-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

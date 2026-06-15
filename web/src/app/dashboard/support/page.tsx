'use client';

import { useQuery } from '@tanstack/react-query';
import { Inbox, UserX, AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { getStats } from '@/features/support/api';
import { SupportBoard } from '@/features/support/components/SupportBoard';

export default function SupportPage() {
  const { data: stats } = useQuery({ queryKey: ['support', 'stats'], queryFn: getStats });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Support Board"
        description="Client tickets — drag a card between columns to update its status."
      />

      <div className="grid gap-4 sm:grid-cols-3 animate-fade-up">
        <StatCard label="Open tickets" value={stats?.open ?? '—'} icon={Inbox} />
        <StatCard label="Unassigned" value={stats?.unassigned ?? '—'} icon={UserX} />
        <StatCard label="Urgent" value={stats?.urgent ?? '—'} icon={AlertTriangle} />
      </div>

      <div className="animate-fade-up" style={{ animationDelay: '60ms' }}>
        <SupportBoard />
      </div>
    </div>
  );
}

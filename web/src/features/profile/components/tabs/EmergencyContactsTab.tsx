'use client';

import { useQuery } from '@tanstack/react-query';
import { Phone, MapPin } from 'lucide-react';
import { fetchEmergencyContacts } from '@/features/profile/api';
import { SectionCard } from '@/features/profile/components/SectionCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

export function EmergencyContactsTab({ employeeId }: { employeeId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['profile', employeeId, 'emergency-contacts'],
    queryFn: () => fetchEmergencyContacts(employeeId),
  });

  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (!data?.length) {
    return (
      <EmptyState
        title="No emergency contacts"
        description="No emergency contacts are on file for your profile."
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {data.map((c) => (
        <SectionCard
          key={c.id}
          title={c.fullName}
          description={c.relationship ?? undefined}
          action={c.isPrimary ? <Badge variant="secondary">Primary</Badge> : undefined}
        >
          <div className="space-y-2 text-sm">
            {c.contactNumber && (
              <p className="inline-flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                {c.contactNumber}
              </p>
            )}
            {c.address && (
              <p className="inline-flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                {c.address}
              </p>
            )}
            {!c.contactNumber && !c.address && (
              <p className="text-muted-foreground">No additional details.</p>
            )}
          </div>
        </SectionCard>
      ))}
    </div>
  );
}

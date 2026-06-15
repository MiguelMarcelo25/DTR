'use client';

import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Camera, Loader2 } from 'lucide-react';
import type { EmployeeProfile, EmployeeRecord } from '@/features/profile/api';
import { uploadProfilePhoto } from '@/features/profile/api';
import {
  computeProfileCompletion,
  positionDepartment,
  profileFullName,
} from '@/features/profile/helpers';
import { CompletionBar } from '@/features/profile/components/CompletionBar';
import { getApiErrorMessage } from '@/lib/api';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { toast } from '@/components/ui/sonner';
import { initials } from '@/lib/utils';

export function ProfileHeader({
  employeeId,
  employee,
  profile,
}: {
  employeeId: string;
  employee?: EmployeeRecord | null;
  profile?: EmployeeProfile | null;
}) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const completion = computeProfileCompletion(profile);
  const name = profileFullName(profile);

  const mutation = useMutation({
    mutationFn: (file: File) => uploadProfilePhoto(employeeId, file),
    onSuccess: () => {
      toast.success('Profile photo updated.');
      qc.invalidateQueries({ queryKey: ['profile', employeeId, 'profile'] });
      qc.invalidateQueries({ queryKey: ['profile', employeeId, 'employee'] });
    },
    onError: (e) => {
      setPreview(null);
      toast.error(getApiErrorMessage(e, 'Photo upload failed'));
    },
  });

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    mutation.mutate(file);
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center">
        <div className="relative shrink-0">
          <Avatar className="h-24 w-24 text-2xl">
            <AvatarImage src={preview ?? profile?.photoUrl ?? undefined} alt={name} />
            <AvatarFallback>{name !== '—' ? initials(name) : '?'}</AvatarFallback>
          </Avatar>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={mutation.isPending}
            aria-label="Change photo"
            className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border bg-background shadow transition-colors hover:bg-accent disabled:opacity-60"
          >
            {mutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Camera className="h-4 w-4" />
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onPick}
          />
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-bold tracking-tight">{name}</h2>
            <StatusBadge status={employee?.employmentStatus} />
          </div>
          <p className="text-sm text-muted-foreground">
            {employee?.employeeNo ? `#${employee.employeeNo}` : '—'} · {positionDepartment(employee)}
          </p>
          <div className="max-w-sm pt-1">
            <CompletionBar
              percentage={completion.percentage}
              filled={completion.filled}
              total={completion.total}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

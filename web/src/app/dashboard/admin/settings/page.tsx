'use client';

import { Info, Settings as SettingsIcon, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value ?? '—'}</span>
    </div>
  );
}

export default function AdminSettingsPage() {
  const { user, hasRole } = useAuth();
  const canManage = hasRole('SUPER_ADMIN', 'ADMIN');

  if (!canManage) {
    return (
      <div className="space-y-6">
        <PageHeader title="Settings" />
        <EmptyState
          icon={ShieldAlert}
          title="Not authorized"
          description="System settings are restricted to administrators."
        />
      </div>
    );
  }

  const appVersion = process.env.NEXT_PUBLIC_APP_VERSION ?? '1.0.0';
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="System configuration and information." />

      <div className="grid animate-fade-up gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <SettingsIcon className="h-4 w-4" />
              Appearance
            </CardTitle>
            <CardDescription>
              Light/dark theme is managed globally — use the theme toggle in the top bar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Your theme preference is stored on this device and applied automatically on every
              visit.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Info className="h-4 w-4" />
              System Information
            </CardTitle>
            <CardDescription>Build and environment details.</CardDescription>
          </CardHeader>
          <CardContent className="divide-y">
            <InfoRow label="Application" value="HRMS Web" />
            <InfoRow label="Version" value={appVersion} />
            <InfoRow label="API endpoint" value={<code className="text-xs">{apiUrl}</code>} />
            <InfoRow label="Environment" value={process.env.NODE_ENV} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your Session</CardTitle>
            <CardDescription>The account currently signed in.</CardDescription>
          </CardHeader>
          <CardContent className="divide-y">
            <InfoRow label="Email" value={user?.email} />
            <InfoRow
              label="Roles"
              value={
                <div className="flex flex-wrap justify-end gap-1">
                  {(user?.roles ?? []).map((r) => (
                    <Badge key={r} variant="secondary">
                      {r}
                    </Badge>
                  ))}
                </div>
              }
            />
            <InfoRow
              label="Account state"
              value={
                <Badge variant={user?.isActive ? 'success' : 'destructive'}>
                  {user?.isActive ? 'Active' : 'Inactive'}
                </Badge>
              }
            />
            <InfoRow label="Employee linked" value={user?.employeeId ? 'Yes' : 'No'} />
          </CardContent>
        </Card>

        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-base">Organization Settings</CardTitle>
            <CardDescription>Company-wide configuration.</CardDescription>
          </CardHeader>
          <CardContent>
            <Separator className="mb-4" />
            <EmptyState
              title="Backend endpoint not yet available"
              description="Persisted organization settings (company name, timezone, currency, etc.) are not implemented on the server yet. The typed client getSettings / updateSettings in features/admin/api.ts is ready to wire once GET /settings and PUT /settings exist."
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

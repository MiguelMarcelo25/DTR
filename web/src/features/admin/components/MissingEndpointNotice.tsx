'use client';

import { PlugZap } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

/**
 * Shown on admin pages whose backend endpoints do not exist yet. The typed
 * `api` functions are already in features/admin/api.ts ready to wire once the
 * routes are added on the server.
 */
export function MissingEndpointNotice({
  title,
  endpoints,
  description,
}: {
  title: string;
  endpoints: string[];
  description?: string;
}) {
  return (
    <div className="space-y-4">
      <EmptyState
        icon={PlugZap}
        title="Backend endpoint not yet available"
        description={
          description ??
          `The ${title} API is not implemented on the server yet. This page and its typed API client are ready — it will work as soon as the endpoints below are added.`
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Endpoints to implement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {endpoints.map((ep) => (
            <div key={ep} className="flex items-center gap-2 text-sm">
              <Badge variant="outline" className="font-mono">
                {ep.split(' ')[0]}
              </Badge>
              <code className="text-muted-foreground">{ep.split(' ').slice(1).join(' ')}</code>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

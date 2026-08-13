import { RefreshCw, AlertCircle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { useSyncStatus } from '@/hooks/use-dashboard-data';
import { queryKeys } from '@/lib/query-client';
import { Button } from '@/components/ui/button';

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

/**
 * Sync status indicator per spec:
 * - pending/processing: "Syncing… {progress}%" with a rotating icon
 * - done: "Last synced {X} minutes ago"
 * - failed: error state with a retry button
 */
export function SyncStatusIndicator() {
  const { data, isLoading } = useSyncStatus();
  const queryClient = useQueryClient();

  if (isLoading || !data) {
    return <div className="h-5 w-32 animate-pulse rounded bg-border/60" />;
  }

  if (data.status === 'pending' || data.status === 'processing') {
    return (
      <div className="flex items-center gap-2 text-sm text-muted">
        <RefreshCw className="h-3.5 w-3.5 animate-spin text-primary" />
        <span>Syncing… {data.progress}%</span>
      </div>
    );
  }

  if (data.status === 'failed') {
    const isRateLimit = data.error === 'rate_limit_low';
    return (
      <div className="flex items-center gap-2 text-sm text-red-400">
        <AlertCircle className="h-3.5 w-3.5" />
        <span>{isRateLimit ? 'Rate limit reached' : 'Sync failed'}</span>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 px-2 text-xs text-red-400 hover:text-red-300"
          onClick={async () => {
            await api.syncTrigger();
            void queryClient.invalidateQueries({ queryKey: queryKeys.syncStatus });
          }}
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <span className="whitespace-nowrap text-sm text-muted">
      {data.last_synced_at
        ? `Last synced ${timeAgo(data.last_synced_at)}`
        : 'Not synced yet'}
    </span>
  );
}

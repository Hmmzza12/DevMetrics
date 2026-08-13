import { AlertCircle, UserX, Loader2 } from 'lucide-react';
import type { CompareSideState } from '@/api/types';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Placeholder for one side of a pair when that side has no data. Deliberately
 * per-side: a missing or still-syncing profile must never blank out the other
 * user's real numbers.
 */
export function SideNotice({
  state,
  username,
  progress,
  compact = false,
}: {
  state: CompareSideState;
  username: string;
  progress?: number;
  compact?: boolean;
}) {
  if (state === 'syncing') {
    return (
      <div className="flex h-full w-full flex-col justify-center gap-2">
        <div className="flex items-center gap-2 text-sm text-muted">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>
            Fetching {username}… {progress != null ? `${progress}%` : ''}
          </span>
        </div>
        <Skeleton className={compact ? 'h-16 w-full' : 'h-32 w-full'} />
      </div>
    );
  }

  const { Icon, title, detail } = messageFor(state, username);

  return (
    <div className="flex h-full min-h-[96px] w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border px-4 py-6 text-center">
      <Icon className="h-5 w-5 text-muted" />
      <p className="text-sm font-medium text-text">{title}</p>
      <p className="text-xs text-muted">{detail}</p>
    </div>
  );
}

function messageFor(state: CompareSideState, username: string) {
  switch (state) {
    case 'not_found':
      return {
        Icon: UserX,
        title: `${username} not found`,
        detail: 'No GitHub user with that username.',
      };
    case 'invalid':
      return {
        Icon: AlertCircle,
        title: 'Invalid username',
        detail: `"${username}" isn't a valid GitHub username.`,
      };
    case 'rate_limited':
      return {
        Icon: AlertCircle,
        title: 'Rate limited',
        detail: 'GitHub rate limit reached. Try again shortly.',
      };
    case 'unavailable':
      return {
        Icon: AlertCircle,
        title: 'Lookups unavailable',
        detail: 'Public lookup is not configured on this server.',
      };
    default:
      return {
        Icon: AlertCircle,
        title: `Couldn't load ${username}`,
        detail: 'Something went wrong fetching this profile.',
      };
  }
}

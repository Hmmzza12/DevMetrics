import { Lock } from 'lucide-react';
import { githubLoginUrl } from '@/api/client';

/**
 * Subtle banner shown on public dashboards: reminds the viewer they're seeing
 * public data only, with a link to connect their own GitHub for private repos.
 */
export function PublicBanner() {
  return (
    <div className="flex items-center gap-2 border-b border-border bg-primary/5 px-4 py-2 text-xs text-muted sm:px-6">
      <Lock className="h-3.5 w-3.5 shrink-0 text-primary" />
      <span>
        Viewing public data only.{' '}
        <a
          href={githubLoginUrl}
          className="font-medium text-primary hover:underline"
        >
          Connect your GitHub
        </a>{' '}
        to include private repositories.
      </span>
    </div>
  );
}

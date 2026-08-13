import { useNavigate } from '@tanstack/react-router';
import { AlertCircle, Clock, SearchX, UserX } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PublicErrorProps {
  username: string;
  code: string | null;
  resetAt: string | null;
  onRetry: () => void;
}

function minutesUntil(resetAt: string | null): number | null {
  if (!resetAt) return null;
  const ms = new Date(resetAt).getTime() - Date.now();
  return ms > 0 ? Math.ceil(ms / 60000) : null;
}

/** Maps a backend error code to a distinct, user-facing message. */
function describe(
  code: string | null,
  username: string,
  resetAt: string | null,
): { icon: LucideIcon; title: string; message: string; showRetry: boolean } {
  switch (code) {
    case 'user_not_found':
      return {
        icon: UserX,
        title: 'User not found',
        message: `No GitHub user found with the username "${username}".`,
        showRetry: false,
      };
    case 'rate_limited':
    case 'rate_limit_low': {
      const mins = minutesUntil(resetAt);
      return {
        icon: Clock,
        title: 'Too many lookups',
        message: mins
          ? `We've hit the lookup limit. Try again in about ${mins} minute${mins === 1 ? '' : 's'}.`
          : "We've hit the lookup limit right now. Please try again shortly.",
        showRetry: true,
      };
    }
    case 'invalid_username':
      return {
        icon: SearchX,
        title: 'Invalid username',
        message: "That doesn't look like a valid GitHub username.",
        showRetry: false,
      };
    case 'public_lookup_disabled':
    case 'github_pat_not_configured':
      return {
        icon: AlertCircle,
        title: 'Public lookups unavailable',
        message: "Public profile lookups aren't configured on this server.",
        showRetry: false,
      };
    default:
      return {
        icon: AlertCircle,
        title: 'Something went wrong',
        message: "We couldn't load this profile. Please try again.",
        showRetry: true,
      };
  }
}

export function PublicError({ username, code, resetAt, onRetry }: PublicErrorProps) {
  const navigate = useNavigate();
  const { icon: Icon, title, message, showRetry } = describe(code, username, resetAt);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 text-red-400">
        <Icon className="h-6 w-6" />
      </div>
      <h2 className="mb-2 font-heading text-xl font-semibold text-text">{title}</h2>
      <p className="mb-6 max-w-sm text-sm text-muted">{message}</p>
      <div className="flex items-center gap-3">
        {showRetry && <Button onClick={onRetry}>Try again</Button>}
        <Button variant="secondary" onClick={() => navigate({ to: '/' })}>
          Analyze another profile
        </Button>
      </div>
    </div>
  );
}

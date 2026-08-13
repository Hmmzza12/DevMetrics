import { Link } from '@tanstack/react-router';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SIDE_A_COLOR, SIDE_B_COLOR } from './constants';

/**
 * Comparison top bar: both users side by side with a "vs" between them. Each
 * username links to that user's full single-profile view.
 */
export function CompareHeader({
  usernameA,
  usernameB,
  avatarA,
  avatarB,
  onReset,
}: {
  usernameA: string;
  usernameB: string;
  avatarA: string | null;
  avatarB: string | null;
  onReset: () => void;
}) {
  return (
    <header className="sticky top-0 z-20 flex flex-col gap-3 border-b border-border bg-background/90 px-4 py-3 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="flex items-center gap-3 sm:gap-4">
        <SideIdentity username={usernameA} avatarUrl={avatarA} color={SIDE_A_COLOR} />
        <span className="font-heading text-sm font-semibold text-muted">vs</span>
        <SideIdentity username={usernameB} avatarUrl={avatarB} color={SIDE_B_COLOR} />
      </div>

      <Button variant="ghost" size="sm" onClick={onReset}>
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Compare different profiles</span>
        <span className="sm:hidden">Change</span>
      </Button>
    </header>
  );
}

function SideIdentity({
  username,
  avatarUrl,
  color,
}: {
  username: string;
  avatarUrl: string | null;
  color: string;
}) {
  return (
    <Link
      to="/u/$username"
      params={{ username }}
      className="flex min-w-0 items-center gap-2 rounded-lg px-1 py-0.5 hover:bg-surface"
      title={`View ${username}'s full profile`}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={username}
          className="h-8 w-8 shrink-0 rounded-full border-2"
          style={{ borderColor: color }}
        />
      ) : (
        <span
          className="h-8 w-8 shrink-0 rounded-full border-2 bg-surface"
          style={{ borderColor: color }}
        />
      )}
      <span className="truncate text-sm font-medium text-text">{username}</span>
    </Link>
  );
}

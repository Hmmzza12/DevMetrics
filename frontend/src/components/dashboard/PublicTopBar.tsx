import { useNavigate } from '@tanstack/react-router';
import { Download, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useExportReport } from '@/pdf/use-export-report';

interface PublicTopBarProps {
  username: string;
  avatarUrl: string | null;
  canExport: boolean;
}

/**
 * Top bar for the public dashboard: looked-up user's avatar + username, an
 * Export button (no AI summary — templated), and "Analyze another profile".
 * No sync status and no sign-out — there is no session here.
 */
export function PublicTopBar({ username, avatarUrl, canExport }: PublicTopBarProps) {
  const navigate = useNavigate();
  const { exportReport, isExporting } = useExportReport({ username, avatarUrl });

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border px-4 sm:px-6">
      <div className="flex items-center gap-3">
        {avatarUrl && (
          <img
            src={avatarUrl}
            alt={username}
            className="h-8 w-8 rounded-full border border-border"
          />
        )}
        <div className="flex flex-col leading-tight">
          <a
            href={`https://github.com/${username}`}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-text hover:text-primary"
          >
            {username}
          </a>
          <span className="text-xs text-muted">Public profile</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {canExport && (
          <Button
            variant="secondary"
            size="sm"
            onClick={exportReport}
            disabled={isExporting}
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">
              {isExporting ? 'Exporting…' : 'Export Report'}
            </span>
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate({ to: '/' })}
          title="Analyze another profile"
        >
          <Search className="h-4 w-4" />
          <span className="hidden sm:inline">Analyze another</span>
        </Button>
      </div>
    </header>
  );
}

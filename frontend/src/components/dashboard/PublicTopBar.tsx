import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { Download, GitCompare, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useExportReport } from '@/pdf/use-export-report';
import { isValidUsername, normalizeUsername } from '@/lib/username';

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
  const [comparing, setComparing] = useState(false);
  const [other, setOther] = useState('');
  const [error, setError] = useState(false);

  function startCompare(e: React.FormEvent) {
    e.preventDefault();
    const target = normalizeUsername(other);
    if (
      !target ||
      !isValidUsername(target) ||
      target.toLowerCase() === username.toLowerCase()
    ) {
      setError(true);
      return;
    }
    navigate({
      to: '/compare/$userA/$userB',
      params: { userA: username, userB: target },
    });
  }

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
        <AnimatePresence initial={false} mode="wait">
          {comparing ? (
            <motion.form
              key="compare-input"
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2 }}
              onSubmit={startCompare}
              className="flex items-center gap-1 overflow-hidden"
            >
              <input
                autoFocus
                value={other}
                onChange={(e) => {
                  setOther(e.target.value);
                  setError(false);
                }}
                placeholder="compare with…"
                aria-label="Second GitHub username to compare"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className={`w-36 rounded-lg border bg-surface px-2.5 py-1.5 text-sm text-text placeholder:text-muted focus:outline-none sm:w-44 ${
                  error ? 'border-red-500/60' : 'border-border focus:border-primary'
                }`}
              />
              <Button type="submit" size="sm" className="shrink-0">
                Go
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setComparing(false);
                  setOther('');
                  setError(false);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </motion.form>
          ) : (
            <motion.div key="compare-button" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setComparing(true)}
                title="Compare with another profile"
              >
                <GitCompare className="h-4 w-4" />
                <span className="hidden sm:inline">Compare with…</span>
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

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

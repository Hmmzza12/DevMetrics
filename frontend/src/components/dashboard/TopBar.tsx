import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { RefreshCw, Download, LogOut } from 'lucide-react';
import { api } from '@/api/client';
import { useMe } from '@/hooks/use-dashboard-data';
import { queryKeys } from '@/lib/query-client';
import { Button } from '@/components/ui/button';
import { SyncStatusIndicator } from './SyncStatusIndicator';
import { useExportReport } from '@/pdf/use-export-report';

export function TopBar() {
  const { data: me } = useMe();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const { exportReport, isExporting } = useExportReport();

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await api.syncTrigger();
      await queryClient.invalidateQueries({ queryKey: queryKeys.syncStatus });
    } finally {
      setRefreshing(false);
    }
  }

  async function handleLogout() {
    // Log the user out no matter what: even if the server call fails (already
    // expired, transient error), we still clear client state and leave the
    // dashboard. Without this, a rejected api.logout() would abort before the
    // redirect and the button would appear to do nothing.
    try {
      await api.logout();
    } catch (err) {
      console.error('logout request failed; clearing client state anyway', err);
    } finally {
      queryClient.clear();
      window.location.href = '/';
    }
  }

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border px-4 sm:px-6">
      <div className="flex items-center gap-3">
        {me?.avatar_url && (
          <img
            src={me.avatar_url}
            alt={me.username}
            className="h-8 w-8 rounded-full border border-border"
          />
        )}
        <span className="hidden text-sm font-medium text-text sm:inline">
          {me?.username}
        </span>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <div className="hidden sm:block">
          <SyncStatusIndicator />
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleRefresh}
          disabled={refreshing}
          title="Refresh sync"
        >
          <RefreshCw className={refreshing ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
        </Button>

        <Button
          variant="secondary"
          size="sm"
          onClick={exportReport}
          disabled={isExporting}
        >
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">
            {isExporting ? 'Generating…' : 'Export Report'}
          </span>
        </Button>

        <Button variant="ghost" size="icon" onClick={handleLogout} title="Log out">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}

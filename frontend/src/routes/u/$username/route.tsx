import { createFileRoute, Outlet } from '@tanstack/react-router';
import { useEffect } from 'react';
import { DataSourceProvider } from '@/lib/data-source';
import { useLenis } from '@/lib/lenis-provider';
import { usePublicProfile } from '@/hooks/use-public-profile';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { BottomTabBar } from '@/components/dashboard/BottomTabBar';
import { PublicTopBar } from '@/components/dashboard/PublicTopBar';
import { PublicBanner } from '@/components/dashboard/PublicBanner';
import { PublicLoading } from '@/components/dashboard/PublicLoading';
import { PublicError } from '@/components/dashboard/PublicError';

export const Route = createFileRoute('/u/$username')({
  component: PublicDashboardLayout,
});

function PublicDashboardLayout() {
  const { username } = Route.useParams();
  const lenis = useLenis();

  // Same as the OAuth dashboard — defer to native scrolling inside the app.
  useEffect(() => {
    lenis?.stop();
    return () => lenis?.start();
  }, [lenis]);

  const profile = usePublicProfile(username);

  return (
    <DataSourceProvider value={{ mode: 'public', username }}>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar mode="public" username={username} />
        <div className="flex min-w-0 flex-1 flex-col">
          <PublicTopBar
            username={profile.username}
            avatarUrl={profile.avatarUrl}
            canExport={profile.phase === 'ready' && !profile.isEmpty}
          />
          <PublicBanner />
          <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
            <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
              {profile.phase === 'error' ? (
                <PublicError
                  username={username}
                  code={profile.errorCode}
                  resetAt={profile.resetAt}
                  onRetry={profile.retry}
                />
              ) : profile.phase === 'ready' ? (
                <Outlet />
              ) : (
                <PublicLoading
                  label={profile.progressLabel}
                  progress={profile.progress}
                />
              )}
            </div>
          </main>
        </div>
        <BottomTabBar mode="public" username={username} />
      </div>
    </DataSourceProvider>
  );
}

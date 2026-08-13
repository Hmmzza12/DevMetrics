import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { useEffect } from 'react';
import { queryClient } from '@/lib/query-client';
import { meQueryOptions } from '@/hooks/use-dashboard-data';
import { useLenis } from '@/lib/lenis-provider';
import { DataSourceProvider } from '@/lib/data-source';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { BottomTabBar } from '@/components/dashboard/BottomTabBar';
import { TopBar } from '@/components/dashboard/TopBar';

export const Route = createFileRoute('/dashboard')({
  // Protected route: redirect to "/" if /auth/me returns 401.
  beforeLoad: async () => {
    try {
      await queryClient.ensureQueryData(meQueryOptions);
    } catch {
      throw redirect({ to: '/' });
    }
  },
  component: DashboardLayout,
});

function DashboardLayout() {
  const lenis = useLenis();

  // The dashboard has its own scrollable inner container; defer to native
  // scrolling there rather than fighting it with Lenis's smoothing.
  useEffect(() => {
    lenis?.stop();
    return () => lenis?.start();
  }, [lenis]);

  return (
    <DataSourceProvider value={{ mode: 'auth' }}>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar />
          <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
            <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
              <Outlet />
            </div>
          </main>
        </div>
        <BottomTabBar />
      </div>
    </DataSourceProvider>
  );
}

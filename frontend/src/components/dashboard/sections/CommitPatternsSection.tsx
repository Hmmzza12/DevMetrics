import { Activity } from 'lucide-react';
import { PageTransition } from '@/components/dashboard/PageTransition';
import { DayOfWeekBarChart } from '@/components/dashboard/DayOfWeekBarChart';
import { HourGrid } from '@/components/dashboard/HourGrid';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorCard } from '@/components/dashboard/ErrorCard';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { useCommitPatterns } from '@/hooks/use-dashboard-data';

/** Shared Commit Patterns section — used by both dashboards. */
export function CommitPatternsSection() {
  const patterns = useCommitPatterns();

  const totalCommits = patterns.data
    ? patterns.data.by_day_of_week.reduce((sum, d) => sum + d.count, 0)
    : 0;
  const isEmpty = patterns.data && totalCommits === 0;

  return (
    <PageTransition>
      <div className="flex flex-col gap-6">
        <h2 className="font-heading text-2xl font-semibold text-text">Commit Patterns</h2>

        {patterns.isError && (
          <ErrorCard
            message="Couldn't load commit patterns."
            onRetry={() => patterns.refetch()}
          />
        )}

        {isEmpty && (
          <EmptyState
            icon={Activity}
            title="No commit activity yet"
            description="With commits in the last 12 months, day-of-week and hour-of-day patterns appear here."
          />
        )}

        {!isEmpty && (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>By day of week</CardTitle>
              </CardHeader>
              {patterns.isLoading && <Skeleton className="h-64 w-full" />}
              {patterns.data && <DayOfWeekBarChart data={patterns.data.by_day_of_week} />}
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>By hour of day</CardTitle>
              </CardHeader>
              {patterns.isLoading && <Skeleton className="h-40 w-full" />}
              {patterns.data && <HourGrid grid={patterns.data.grid} />}
            </Card>
          </div>
        )}
      </div>
    </PageTransition>
  );
}

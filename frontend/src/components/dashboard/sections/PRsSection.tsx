import { motion } from 'framer-motion';
import { Clock, Eye, GitMerge, GitPullRequest } from 'lucide-react';
import { PageTransition } from '@/components/dashboard/PageTransition';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorCard } from '@/components/dashboard/ErrorCard';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { CircularProgress } from '@/components/dashboard/CircularProgress';
import { MonthlyPRBarChart } from '@/components/dashboard/MonthlyPRBarChart';
import { usePRs } from '@/hooks/use-dashboard-data';
import { formatHours } from '@/lib/format';
import { statGridVariants } from '@/components/dashboard/StatCard';

const metricCardVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

/** Shared PR Analytics section — used by both dashboards. */
export function PRsSection() {
  const prs = usePRs();

  return (
    <PageTransition>
      <div className="flex flex-col gap-6">
        <h2 className="font-heading text-2xl font-semibold text-text">PR Analytics</h2>

        {prs.isLoading && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <Skeleton className="h-24 w-full" />
              </Card>
            ))}
          </div>
        )}

        {prs.isError && (
          <ErrorCard message="Couldn't load PR metrics." onRetry={() => prs.refetch()} />
        )}

        {prs.data && prs.data.total_prs === 0 && (
          <EmptyState
            icon={GitPullRequest}
            title="No pull requests yet"
            description="When there are pull requests, merge time, review turnaround, and merge rate show up here."
          />
        )}

        {prs.data && prs.data.total_prs > 0 && (
          <motion.div
            variants={statGridVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 gap-4 sm:grid-cols-3"
          >
            <motion.div variants={metricCardVariants}>
              <Card className="flex flex-col items-center gap-3 text-center">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Clock className="h-4 w-4" />
                </div>
                <div className="font-heading text-3xl font-bold text-text">
                  {formatHours(prs.data.avg_open_to_merge_hours)}
                </div>
                <div className="text-sm text-muted">Avg open-to-merge time</div>
              </Card>
            </motion.div>

            <motion.div variants={metricCardVariants}>
              <Card className="flex flex-col items-center gap-3 text-center">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Eye className="h-4 w-4" />
                </div>
                <div className="font-heading text-3xl font-bold text-text">
                  {formatHours(prs.data.avg_first_review_hours)}
                </div>
                <div className="text-sm text-muted">Avg first-review time</div>
              </Card>
            </motion.div>

            <motion.div variants={metricCardVariants}>
              <Card className="flex flex-col items-center gap-3 text-center">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <GitMerge className="h-4 w-4" />
                </div>
                <CircularProgress percent={prs.data.merge_rate} size={96} strokeWidth={8} />
                <div className="text-sm text-muted">Merge rate</div>
              </Card>
            </motion.div>
          </motion.div>
        )}

        {(prs.isLoading || (prs.data && prs.data.total_prs > 0)) && (
          <Card>
            <CardHeader>
              <CardTitle>PRs opened per month</CardTitle>
            </CardHeader>
            {prs.isLoading && <Skeleton className="h-64 w-full" />}
            {prs.data && prs.data.total_prs > 0 && (
              <MonthlyPRBarChart data={prs.data.monthly} />
            )}
          </Card>
        )}
      </div>
    </PageTransition>
  );
}

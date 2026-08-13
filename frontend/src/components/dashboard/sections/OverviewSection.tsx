import { motion } from 'framer-motion';
import { GitCommitHorizontal, FolderGit2, Star, Flame } from 'lucide-react';
import { PageTransition } from '@/components/dashboard/PageTransition';
import { StatCard, statGridVariants } from '@/components/dashboard/StatCard';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorCard } from '@/components/dashboard/ErrorCard';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Heatmap } from '@/components/dashboard/Heatmap';
import { MiniLanguagesDonut } from '@/components/dashboard/MiniLanguagesDonut';
import { useHeatmap, useLanguages, useOverview } from '@/hooks/use-dashboard-data';

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <Skeleton className="mb-3 h-9 w-9 rounded-lg" />
          <Skeleton className="mb-2 h-8 w-16" />
          <Skeleton className="h-4 w-20" />
        </Card>
      ))}
    </div>
  );
}

/** Shared Overview section — used by both the OAuth and public dashboards. */
export function OverviewSection() {
  const overview = useOverview();
  const heatmap = useHeatmap();
  const languages = useLanguages();

  return (
    <PageTransition>
      <div className="flex flex-col gap-8">
        <div>
          <h2 className="mb-4 font-heading text-2xl font-semibold text-text">
            Overview
          </h2>

          {overview.isLoading && <StatsSkeleton />}
          {overview.isError && (
            <ErrorCard
              message="Couldn't load overview stats."
              onRetry={() => overview.refetch()}
            />
          )}
          {overview.data && (
            <motion.div
              variants={statGridVariants}
              initial="hidden"
              animate="show"
              className="grid grid-cols-2 gap-4 sm:grid-cols-4"
            >
              <StatCard
                label="Total Commits"
                value={overview.data.total_commits}
                icon={GitCommitHorizontal}
              />
              <StatCard
                label="Repos"
                value={overview.data.repo_count}
                icon={FolderGit2}
              />
              <StatCard label="Stars" value={overview.data.total_stars} icon={Star} />
              <StatCard
                label="Current Streak"
                value={overview.data.current_streak}
                icon={Flame}
                suffix=" days"
              />
            </motion.div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent activity</CardTitle>
            </CardHeader>
            {heatmap.isLoading && <Skeleton className="h-40 w-full" />}
            {heatmap.isError && (
              <ErrorCard
                message="Couldn't load recent activity."
                onRetry={() => heatmap.refetch()}
              />
            )}
            {heatmap.data && (
              <Heatmap days={heatmap.data.days.slice(-90)} cellSize={10} showLabels={false} />
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top languages</CardTitle>
            </CardHeader>
            {languages.isLoading && <Skeleton className="h-36 w-full" />}
            {languages.isError && (
              <ErrorCard
                message="Couldn't load language breakdown."
                onRetry={() => languages.refetch()}
              />
            )}
            {languages.data && <MiniLanguagesDonut languages={languages.data.languages} />}
          </Card>
        </div>
      </div>
    </PageTransition>
  );
}

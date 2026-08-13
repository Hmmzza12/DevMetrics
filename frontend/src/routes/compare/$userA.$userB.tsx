import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import type { CompareSide } from '@/api/types';
import { useCompare } from '@/hooks/use-compare';
import { monthlySeries } from '@/lib/compare-data';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorCard } from '@/components/dashboard/ErrorCard';
import { CompareHeader } from '@/components/compare/CompareHeader';
import { HeadToHeadStats } from '@/components/compare/HeadToHeadStats';
import { CommitOverlayChart } from '@/components/compare/CommitOverlayChart';
import { CompareHeatmaps } from '@/components/compare/CompareHeatmaps';
import { CompareLanguages } from '@/components/compare/CompareLanguages';
import { ComparePatterns } from '@/components/compare/ComparePatterns';
import { ComparePRs } from '@/components/compare/ComparePRs';

export const Route = createFileRoute('/compare/$userA/$userB')({
  component: ComparePage,
});

/** Placeholder side used while the very first request is still in flight. */
function pendingSide(username: string): CompareSide {
  return {
    username,
    state: 'syncing',
    avatar_url: null,
    progress: 0,
    error: null,
    reset_at: null,
    data: null,
  };
}

function ComparePage() {
  const { userA, userB } = Route.useParams();
  const navigate = useNavigate();

  // Unlike the dashboards (which scroll an inner container and therefore stop
  // Lenis), this page scrolls the window — leave Lenis running or scrolling
  // locks up entirely.
  const cmp = useCompare(userA, userB);

  // Render the full layout immediately — a side with no data yet shows its own
  // placeholder, so a slow profile never blocks a cached one.
  const sideA = cmp.sideA ?? pendingSide(userA);
  const sideB = cmp.sideB ?? pendingSide(userB);

  const monthly = monthlySeries(
    sideA.data?.heatmap.days ?? null,
    sideB.data?.heatmap.days ?? null,
  );

  if (cmp.isError) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <ErrorCard
          message="We couldn't load this comparison. Please try again."
          onRetry={cmp.refetch}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <CompareHeader
        usernameA={sideA.username}
        usernameB={sideB.username}
        avatarA={sideA.avatar_url}
        avatarB={sideB.avatar_url}
        onReset={() => navigate({ to: '/' })}
      />

      <main className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-8 sm:px-6">
        <Section title="Head to head">
          {cmp.isLoading ? (
            <StatsSkeleton />
          ) : (
            <HeadToHeadStats
              usernameA={sideA.username}
              usernameB={sideB.username}
              overviewA={sideA.data?.overview ?? null}
              overviewB={sideB.data?.overview ?? null}
            />
          )}
        </Section>

        <Section
          title="Commit activity"
          description="Monthly commits over the last 12 months."
        >
          <Card>
            {cmp.isLoading ? (
              <Skeleton className="h-72 w-full" />
            ) : (
              <CommitOverlayChart
                data={monthly}
                usernameA={sideA.username}
                usernameB={sideB.username}
              />
            )}
          </Card>
        </Section>

        <Section title="Contribution heatmaps">
          <Card>
            {cmp.isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <CompareHeatmaps
                sideA={sideA}
                sideB={sideB}
                progressA={cmp.progressA}
                progressB={cmp.progressB}
              />
            )}
          </Card>
        </Section>

        <Section title="Languages">
          <Card>
            {cmp.isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <CompareLanguages
                sideA={sideA}
                sideB={sideB}
                progressA={cmp.progressA}
                progressB={cmp.progressB}
              />
            )}
          </Card>
        </Section>

        <Section title="Commit patterns">
          <Card>
            {cmp.isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <ComparePatterns
                sideA={sideA}
                sideB={sideB}
                progressA={cmp.progressA}
                progressB={cmp.progressB}
              />
            )}
          </Card>
        </Section>

        <Section title="Pull requests">
          {cmp.isLoading ? (
            <StatsSkeleton count={3} />
          ) : (
            <ComparePRs
              sideA={sideA}
              sideB={sideB}
              progressA={cmp.progressA}
              progressB={cmp.progressB}
            />
          )}
        </Section>
      </main>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-64px' }}
      transition={{ duration: 0.4 }}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-1">
        <h2 className="font-heading text-xl font-bold text-text">{title}</h2>
        {description && <p className="text-sm text-muted">{description}</p>}
      </div>
      {children}
    </motion.section>
  );
}

function StatsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-36 w-full rounded-xl" />
      ))}
    </div>
  );
}

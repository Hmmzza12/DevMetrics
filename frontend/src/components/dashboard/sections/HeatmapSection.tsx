import { PageTransition } from '@/components/dashboard/PageTransition';
import { Heatmap } from '@/components/dashboard/Heatmap';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorCard } from '@/components/dashboard/ErrorCard';
import { useHeatmap } from '@/hooks/use-dashboard-data';
import { intensityColor } from '@/lib/color-scale';

/** Shared Heatmap section — used by both the OAuth and public dashboards. */
export function HeatmapSection() {
  const heatmap = useHeatmap();
  const totalCommits = heatmap.data?.days.reduce((s, d) => s + d.count, 0) ?? 0;
  const activeDays = heatmap.data?.days.filter((d) => d.count > 0).length ?? 0;

  return (
    <PageTransition>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-heading text-2xl font-semibold text-text">Heatmap</h2>
          {heatmap.data && (
            <p className="text-sm text-muted">
              {totalCommits.toLocaleString()} commits across {activeDays} active days —
              last 12 months
            </p>
          )}
        </div>

        <Card className="overflow-hidden">
          {heatmap.isLoading && <Skeleton className="h-40 w-full" />}
          {heatmap.isError && (
            <ErrorCard
              message="Couldn't load the contribution heatmap."
              onRetry={() => heatmap.refetch()}
            />
          )}
          {heatmap.data && <Heatmap days={heatmap.data.days} />}
        </Card>

        <div className="flex items-center gap-2 text-xs text-muted">
          <span>Less</span>
          <div className="flex gap-1">
            {[0, 15, 40, 70, 100].map((f) => (
              <div
                key={f}
                className="h-3 w-3 rounded-sm"
                style={{ backgroundColor: intensityColor(f, 100) }}
              />
            ))}
          </div>
          <span>More</span>
        </div>
      </div>
    </PageTransition>
  );
}

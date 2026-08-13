import { motion, type Variants } from 'framer-motion';
import { GitPullRequest, Clock, MessageSquare } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { CompareSide, PRMetrics } from '@/api/types';
import { Card } from '@/components/ui/card';
import { formatHours } from '@/lib/format';
import { cn } from '@/lib/utils';
import { SIDE_A_COLOR, SIDE_B_COLOR } from './constants';
import { SideNotice } from './SideNotice';

const gridVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};
const cardVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

interface PRMetric {
  label: string;
  icon: LucideIcon;
  /** Formatted display value, or null when this user has no PRs at all. */
  read: (prs: PRMetrics) => string | null;
  /** Raw comparable value for emphasis; lower wins for durations. */
  raw: (prs: PRMetrics) => number | null;
  lowerIsBetter: boolean;
}

const METRICS: PRMetric[] = [
  {
    label: 'Avg open → merge',
    icon: Clock,
    read: (p) => (p.total_prs === 0 ? null : formatHours(p.avg_open_to_merge_hours)),
    raw: (p) => p.avg_open_to_merge_hours,
    lowerIsBetter: true,
  },
  {
    label: 'Avg first review',
    icon: MessageSquare,
    read: (p) => (p.total_prs === 0 ? null : formatHours(p.avg_first_review_hours)),
    raw: (p) => p.avg_first_review_hours,
    lowerIsBetter: true,
  },
  {
    label: 'Merge rate',
    icon: GitPullRequest,
    read: (p) => (p.total_prs === 0 ? null : `${p.merge_rate.toFixed(0)}%`),
    raw: (p) => p.merge_rate,
    lowerIsBetter: false,
  },
];

/**
 * Paired PR cards. A user with no PRs shows an empty state on their side only —
 * the other user's metrics still render.
 */
export function ComparePRs({
  sideA,
  sideB,
  progressA,
  progressB,
}: {
  sideA: CompareSide;
  sideB: CompareSide;
  progressA: number;
  progressB: number;
}) {
  const prsA = sideA.data?.prs ?? null;
  const prsB = sideB.data?.prs ?? null;

  return (
    <motion.div
      variants={gridVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true }}
      className="grid grid-cols-1 gap-4 md:grid-cols-3"
    >
      {METRICS.map((metric) => {
        const rawA = prsA ? metric.raw(prsA) : null;
        const rawB = prsB ? metric.raw(prsB) : null;
        const bothKnown =
          rawA != null && rawB != null && prsA!.total_prs > 0 && prsB!.total_prs > 0;

        const aLeads =
          bothKnown && (metric.lowerIsBetter ? rawA! < rawB! : rawA! > rawB!);
        const bLeads =
          bothKnown && (metric.lowerIsBetter ? rawB! < rawA! : rawB! > rawA!);

        return (
          <motion.div key={metric.label} variants={cardVariants}>
            <Card className="flex flex-col gap-4">
              <div className="flex items-center gap-2 text-sm text-muted">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <metric.icon className="h-3.5 w-3.5" />
                </span>
                {metric.label}
              </div>

              <div className="flex items-start justify-between gap-3">
                <PRSideValue
                  side={sideA}
                  progress={progressA}
                  value={prsA ? metric.read(prsA) : null}
                  leads={aLeads}
                  color={SIDE_A_COLOR}
                />
                <div className="pt-6 text-xs text-muted">vs</div>
                <PRSideValue
                  side={sideB}
                  progress={progressB}
                  value={prsB ? metric.read(prsB) : null}
                  leads={bLeads}
                  color={SIDE_B_COLOR}
                  alignRight
                />
              </div>
            </Card>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

function PRSideValue({
  side,
  progress,
  value,
  leads,
  color,
  alignRight = false,
}: {
  side: CompareSide;
  progress: number;
  value: string | null;
  leads: boolean;
  color: string;
  alignRight?: boolean;
}) {
  // No data for the profile at all (missing/syncing) vs. profile loaded but no PRs.
  if (!side.data) {
    return (
      <div className={cn('flex min-w-0 flex-1 flex-col', alignRight && 'items-end')}>
        <span className="max-w-full truncate text-xs text-muted">{side.username}</span>
        <SideNotice
          state={side.state}
          username={side.username}
          progress={progress}
          compact
        />
      </div>
    );
  }

  return (
    <div className={cn('flex min-w-0 flex-1 flex-col', alignRight && 'items-end')}>
      <span className="max-w-full truncate text-xs text-muted">{side.username}</span>
      {value == null ? (
        <span className="text-sm text-muted">No PRs</span>
      ) : (
        <span
          className="font-heading text-2xl font-bold text-text"
          style={{ color: leads ? color : undefined }}
        >
          {value}
        </span>
      )}
    </div>
  );
}

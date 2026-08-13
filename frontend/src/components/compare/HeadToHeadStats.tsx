import { motion, type Variants } from 'framer-motion';
import { GitCommit, FolderGit2, Star, Users, Flame, Trophy } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Overview } from '@/api/types';
import { Card } from '@/components/ui/card';
import { AnimatedNumber } from '@/components/dashboard/AnimatedNumber';
import { cn } from '@/lib/utils';
import { SIDE_A_COLOR, SIDE_B_COLOR } from './constants';

const gridVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

interface Metric {
  key: keyof Overview;
  label: string;
  icon: LucideIcon;
  suffix?: string;
}

const METRICS: Metric[] = [
  { key: 'total_commits', label: 'Total Commits', icon: GitCommit },
  { key: 'repo_count', label: 'Public Repos', icon: FolderGit2 },
  { key: 'total_stars', label: 'Total Stars', icon: Star },
  { key: 'followers', label: 'Followers', icon: Users },
  { key: 'current_streak', label: 'Current Streak', icon: Flame, suffix: ' days' },
  { key: 'longest_streak', label: 'Longest Streak', icon: Trophy, suffix: ' days' },
];

interface HeadToHeadStatsProps {
  usernameA: string;
  usernameB: string;
  overviewA: Overview | null;
  overviewB: Overview | null;
}

/**
 * Paired stat cards. The higher value is tinted in that side's colour and the
 * gap is shown underneath — but there is deliberately no aggregate winner or
 * score: this is a comparison, not a leaderboard.
 */
export function HeadToHeadStats({
  usernameA,
  usernameB,
  overviewA,
  overviewB,
}: HeadToHeadStatsProps) {
  return (
    <motion.div
      variants={gridVariants}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      {METRICS.map((metric) => (
        <motion.div key={metric.key} variants={cardVariants}>
          <PairedStatCard
            metric={metric}
            usernameA={usernameA}
            usernameB={usernameB}
            valueA={overviewA?.[metric.key] ?? null}
            valueB={overviewB?.[metric.key] ?? null}
          />
        </motion.div>
      ))}
    </motion.div>
  );
}

function PairedStatCard({
  metric,
  usernameA,
  usernameB,
  valueA,
  valueB,
}: {
  metric: Metric;
  usernameA: string;
  usernameB: string;
  valueA: number | null;
  valueB: number | null;
}) {
  const Icon = metric.icon;
  // Emphasis only applies when both sides are known and actually differ.
  const bothKnown = valueA != null && valueB != null;
  const aLeads = bothKnown && valueA > valueB;
  const bLeads = bothKnown && valueB > valueA;
  const delta = bothKnown ? Math.abs(valueA - valueB) : null;

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center gap-2 text-sm text-muted">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-3.5 w-3.5" />
        </span>
        {metric.label}
      </div>

      <div className="flex items-start justify-between gap-3">
        <SideValue
          username={usernameA}
          value={valueA}
          suffix={metric.suffix}
          leads={aLeads}
          color={SIDE_A_COLOR}
        />
        <div className="pt-6 text-xs text-muted">vs</div>
        <SideValue
          username={usernameB}
          value={valueB}
          suffix={metric.suffix}
          leads={bLeads}
          color={SIDE_B_COLOR}
          alignRight
        />
      </div>

      {delta != null && delta > 0 && (
        <div className="border-t border-border pt-2 text-center text-xs text-muted">
          <AnimatedNumber value={delta} />
          {metric.suffix} difference
        </div>
      )}
    </Card>
  );
}

function SideValue({
  username,
  value,
  suffix,
  leads,
  color,
  alignRight = false,
}: {
  username: string;
  value: number | null;
  suffix?: string;
  leads: boolean;
  color: string;
  alignRight?: boolean;
}) {
  return (
    <div className={cn('flex min-w-0 flex-1 flex-col', alignRight && 'items-end')}>
      <span className="max-w-full truncate text-xs text-muted">{username}</span>
      <span
        className="font-heading text-2xl font-bold"
        style={{ color: leads ? color : undefined }}
      >
        {value == null ? (
          <span className="text-muted">—</span>
        ) : (
          <>
            <AnimatedNumber value={value} />
            {suffix}
          </>
        )}
      </span>
    </div>
  );
}

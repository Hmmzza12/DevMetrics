import { motion } from 'framer-motion';
import type { CompareSide } from '@/api/types';
import { DayOfWeekBarChart } from '@/components/dashboard/DayOfWeekBarChart';
import { HourGrid } from '@/components/dashboard/HourGrid';
import { dayOfWeekRows, sharedGridMax } from '@/lib/compare-data';
import { SIDE_A_COLOR, SIDE_B_COLOR } from './constants';
import { SideNotice } from './SideNotice';

/**
 * Day-of-week as grouped bars (two bars per day), then the two hour grids
 * stacked on a shared intensity scale — same rule as the heatmaps.
 */
export function ComparePatterns({
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
  const rows = dayOfWeekRows(
    sideA.data?.commit_patterns ?? null,
    sideB.data?.commit_patterns ?? null,
  );

  const sharedMax = sharedGridMax(
    sideA.data?.commit_patterns.grid,
    sideB.data?.commit_patterns.grid,
  );

  return (
    <div className="flex min-w-0 flex-col gap-8">
      <div className="flex min-w-0 flex-col gap-3">
        <h3 className="font-heading text-base font-semibold text-text">
          Commits by day of week
        </h3>
        {rows.length > 0 ? (
          <DayOfWeekBarChart
            data={rows}
            series={[
              { key: 'a', name: sideA.username, color: SIDE_A_COLOR },
              { key: 'b', name: sideB.username, color: SIDE_B_COLOR },
            ]}
          />
        ) : (
          <p className="text-sm text-muted">No commit pattern data yet.</p>
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-6">
        <h3 className="font-heading text-base font-semibold text-text">
          Commits by hour
        </h3>
        <HourRow side={sideA} progress={progressA} sharedMax={sharedMax} />
        <HourRow side={sideB} progress={progressB} sharedMax={sharedMax} />
        <p className="text-xs text-muted">
          Both grids share one intensity scale (peak {sharedMax} commits/hour).
        </p>
      </div>
    </div>
  );
}

function HourRow({
  side,
  progress,
  sharedMax,
}: {
  side: CompareSide;
  progress: number;
  sharedMax: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className="flex min-w-0 flex-col gap-2"
    >
      <span className="text-sm font-medium text-text">{side.username}</span>
      {side.data ? (
        <HourGrid grid={side.data.commit_patterns.grid} maxOverride={sharedMax} />
      ) : (
        <SideNotice
          state={side.state}
          username={side.username}
          progress={progress}
          compact
        />
      )}
    </motion.div>
  );
}

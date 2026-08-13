import { motion } from 'framer-motion';
import type { CompareSide } from '@/api/types';
import { Heatmap } from '@/components/dashboard/Heatmap';
import { sharedDailyMax } from '@/lib/compare-data';
import { SideNotice } from './SideNotice';

/**
 * Both heatmaps stacked, sharing ONE intensity denominator (the busiest day
 * across both users). Per-heatmap normalisation would make a 3-commits/day user
 * look identical to a 50-commits/day user, which defeats the comparison.
 */
export function CompareHeatmaps({
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
  const sharedMax = sharedDailyMax(
    sideA.data?.heatmap.days,
    sideB.data?.heatmap.days,
  );

  return (
    // min-w-0 throughout: flex children default to min-width:auto, which would
    // let the year-wide heatmap push the whole page wider than the viewport
    // instead of scrolling inside its own overflow-x-auto container.
    <div className="flex min-w-0 flex-col gap-8">
      <HeatmapRow side={sideA} progress={progressA} sharedMax={sharedMax} />
      <HeatmapRow side={sideB} progress={progressB} sharedMax={sharedMax} />
      <p className="text-xs text-muted">
        Both heatmaps use the same intensity scale (peak {sharedMax} commits/day),
        so colour depth is directly comparable.
      </p>
    </div>
  );
}

function HeatmapRow({
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
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className="flex min-w-0 flex-col gap-2"
    >
      <span className="text-sm font-medium text-text">{side.username}</span>
      {side.data ? (
        <Heatmap days={side.data.heatmap.days} maxOverride={sharedMax} />
      ) : (
        <SideNotice state={side.state} username={side.username} progress={progress} />
      )}
    </motion.div>
  );
}

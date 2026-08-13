import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { HeatmapDay } from '@/api/types';
import { intensityColor } from '@/lib/color-scale';

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];
const DAY_LABELS = ['Mon', '', 'Wed', '', 'Fri', '', ''];

type Cell = HeatmapDay | null;

function mondayIndex(date: Date): number {
  const jsDay = date.getUTCDay(); // 0 = Sun
  return (jsDay + 6) % 7; // 0 = Mon
}

function parseDay(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Bucket days (chronological, oldest-first) into Mon-Sun week columns. */
function buildWeeks(days: HeatmapDay[]): Cell[][] {
  if (days.length === 0) return [];
  const first = parseDay(days[0].date);
  const leadingPad = mondayIndex(first);

  const cells: Cell[] = [...Array<Cell>(leadingPad).fill(null), ...days];
  const trailingPad = (7 - (cells.length % 7)) % 7;
  for (let i = 0; i < trailingPad; i++) cells.push(null);

  const weeks: Cell[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

function formatDateLabel(dateStr: string): string {
  const d = parseDay(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

interface HeatmapProps {
  days: HeatmapDay[];
  cellSize?: number;
  gap?: number;
  showLabels?: boolean;
}

/**
 * GitHub-style contribution heatmap. Custom-built (not a chart library):
 * 53 columns x 7 rows for the full year, fewer columns for a sliced preview.
 * No entrance animation on the squares (spec) — only hover scale + tooltip.
 */
export function Heatmap({ days, cellSize = 11, gap = 3, showLabels = true }: HeatmapProps) {
  const weeks = useMemo(() => buildWeeks(days), [days]);
  const max = useMemo(() => Math.max(1, ...days.map((d) => d.count)), [days]);
  const [hovered, setHovered] = useState<{ cell: HeatmapDay; x: number; y: number } | null>(
    null,
  );

  const monthLabelForWeek = useMemo(() => {
    const labels: (string | null)[] = [];
    let lastMonth = -1;
    for (const week of weeks) {
      const firstReal = week.find((c) => c !== null);
      if (!firstReal) {
        labels.push(null);
        continue;
      }
      const month = parseDay(firstReal.date).getUTCMonth();
      if (month !== lastMonth) {
        labels.push(MONTH_LABELS[month]);
        lastMonth = month;
      } else {
        labels.push(null);
      }
    }
    return labels;
  }, [weeks]);

  return (
    <div className="relative w-full overflow-x-auto">
      <div className="inline-flex gap-[3px]">
        {showLabels && (
          <div
            className="flex flex-col justify-between pr-1 text-[10px] text-muted"
            style={{ marginTop: showLabels ? 16 : 0 }}
          >
            {DAY_LABELS.map((label, i) => (
              <div key={i} style={{ height: cellSize, lineHeight: `${cellSize}px` }}>
                {label}
              </div>
            ))}
          </div>
        )}

        <div>
          {showLabels && (
            <div className="mb-1 flex" style={{ gap }}>
              {weeks.map((_, i) => (
                <div
                  key={i}
                  className="text-[10px] text-muted"
                  style={{ width: cellSize }}
                >
                  {monthLabelForWeek[i]}
                </div>
              ))}
            </div>
          )}

          <div className="flex" style={{ gap }}>
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col" style={{ gap }}>
                {week.map((cell, di) => {
                  if (!cell) {
                    return (
                      <div key={di} style={{ width: cellSize, height: cellSize }} />
                    );
                  }
                  return (
                    <motion.div
                      key={di}
                      style={{
                        width: cellSize,
                        height: cellSize,
                        backgroundColor: intensityColor(cell.count, max),
                        borderRadius: 2,
                      }}
                      whileHover={{ scale: 1.35 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setHovered({
                          cell,
                          x: rect.left + rect.width / 2,
                          y: rect.top,
                        });
                      }}
                      onMouseLeave={() => setHovered(null)}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-full rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs text-text shadow-lg"
            style={{ left: hovered.x, top: hovered.y - 8 }}
          >
            <span className="font-medium">{hovered.cell.count}</span>{' '}
            <span className="text-muted">
              commit{hovered.cell.count === 1 ? '' : 's'} on {formatDateLabel(hovered.cell.date)}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

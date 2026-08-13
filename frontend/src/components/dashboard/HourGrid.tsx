import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { intensityColor } from '@/lib/color-scale';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOUR_TICKS = [0, 6, 12, 18];

/** Custom SVG hour-of-day x day-of-week grid — 24 columns x 7 rows. Not a chart library. */
export function HourGrid({ grid }: { grid: number[][] }) {
  const cell = 20;
  const labelGutter = 34;
  const topGutter = 18;
  const width = labelGutter + 24 * cell;
  const height = topGutter + 7 * cell;

  const max = useMemo(
    () => Math.max(1, ...grid.flatMap((row) => row)),
    [grid],
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="w-full overflow-x-auto"
    >
      <svg width={width} height={height} className="min-w-full">
        {HOUR_TICKS.map((h) => (
          <text
            key={h}
            x={labelGutter + h * cell + cell / 2}
            y={12}
            textAnchor="middle"
            fontSize={10}
            fill="#64748b"
          >
            {h}:00
          </text>
        ))}

        {DAY_LABELS.map((label, row) => (
          <text
            key={label}
            x={labelGutter - 8}
            y={topGutter + row * cell + cell / 2 + 4}
            textAnchor="end"
            fontSize={10}
            fill="#64748b"
          >
            {label}
          </text>
        ))}

        {grid.map((row, rowIdx) =>
          row.map((value, hour) => (
            <rect
              key={`${rowIdx}-${hour}`}
              x={labelGutter + hour * cell}
              y={topGutter + rowIdx * cell}
              width={cell - 2}
              height={cell - 2}
              rx={3}
              fill={intensityColor(value, max)}
              className="transition-opacity hover:opacity-80"
            >
              <title>
                {value} commit{value === 1 ? '' : 's'} — {DAY_LABELS[rowIdx]} {hour}:00
              </title>
            </rect>
          )),
        )}
      </svg>
    </motion.div>
  );
}

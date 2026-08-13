import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';

export interface BarSeries {
  /** Key to read from each row. */
  key: string;
  /** Legend/tooltip label. */
  name: string;
  color: string;
}

const DEFAULT_SERIES: BarSeries[] = [
  { key: 'count', name: 'Commits', color: '#6366f1' },
];

interface DayOfWeekBarChartProps {
  /**
   * Rows keyed by `day`, plus one field per series. A null value means "this
   * user has no data yet" and is skipped rather than drawn as a zero bar.
   */
  data: Record<string, string | number | null>[];
  /**
   * One bar per series, grouped per day. Defaults to the single `count` bar
   * used by single-profile mode; comparison passes one series per user.
   */
  series?: BarSeries[];
}

export function DayOfWeekBarChart({
  data,
  series = DEFAULT_SERIES,
}: DayOfWeekBarChartProps) {
  const showLegend = series.length > 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className="h-64 w-full"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" vertical={false} />
          <XAxis
            dataKey="day"
            tick={{ fill: '#64748b', fontSize: 12 }}
            axisLine={{ stroke: '#1e1e2e' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#64748b', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ fill: 'rgba(99, 102, 241, 0.08)' }}
            contentStyle={{
              background: '#111118',
              border: '1px solid #1e1e2e',
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          {showLegend && (
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="circle" />
          )}
          {series.map((s) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.name}
              fill={s.color}
              radius={[4, 4, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  );
}

import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { MonthlyRow } from '@/lib/compare-data';
import { SIDE_A_COLOR, SIDE_B_COLOR } from './constants';

/**
 * Monthly commits for both users on ONE set of axes — the single most
 * informative view on the page, which is why it stays one chart rather than two
 * stacked ones. Values are derived from each user's heatmap, so no extra
 * endpoint is needed.
 */
export function CommitOverlayChart({
  data,
  usernameA,
  usernameB,
}: {
  data: MonthlyRow[];
  usernameA: string;
  usernameB: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className="h-72 w-full"
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" vertical={false} />
          <XAxis
            dataKey="month"
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
            contentStyle={{
              background: '#111118',
              border: '1px solid #1e1e2e',
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="circle" />
          <Line
            type="monotone"
            dataKey="a"
            name={usernameA}
            stroke={SIDE_A_COLOR}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
            connectNulls={false}
          />
          <Line
            type="monotone"
            dataKey="b"
            name={usernameB}
            stroke={SIDE_B_COLOR}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </motion.div>
  );
}

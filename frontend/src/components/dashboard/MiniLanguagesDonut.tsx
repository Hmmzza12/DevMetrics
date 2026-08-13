import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import type { LanguageBreakdown } from '@/api/types';
import { colorForIndex } from '@/lib/language-colors';

export function MiniLanguagesDonut({ languages }: { languages: LanguageBreakdown[] }) {
  const top = languages.slice(0, 6);

  if (top.length === 0) {
    return (
      <div className="flex h-full min-h-[160px] items-center justify-center text-sm text-muted">
        No language data yet
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <div className="h-36 w-36 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={top}
              dataKey="percentage"
              nameKey="language"
              innerRadius="65%"
              outerRadius="100%"
              paddingAngle={2}
              stroke="none"
              isAnimationActive={false}
            >
              {top.map((entry, i) => (
                <Cell key={entry.language} fill={colorForIndex(i)} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="flex flex-col gap-1.5 text-sm">
        {top.map((lang, i) => (
          <li key={lang.language} className="flex items-center gap-2">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: colorForIndex(i) }}
            />
            <span className="text-text">{lang.language}</span>
            <span className="text-muted">{lang.percentage.toFixed(0)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

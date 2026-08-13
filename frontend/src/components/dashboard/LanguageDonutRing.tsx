import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { LanguageBreakdown } from '@/api/types';
import { colorForIndex } from '@/lib/language-colors';

interface LanguageDonutRingProps {
  languages: LanguageBreakdown[];
  /**
   * Resolves a slice colour. Defaults to position in *this* list, which is fine
   * for a single profile. Comparison passes a language-keyed resolver so the
   * same language is the same colour in both donuts and the shared legend —
   * otherwise position-based colours make the two rings uncomparable.
   */
  colorFor?: (language: string, index: number) => string;
  innerRadius?: string;
  outerRadius?: string;
  /** Dims every slice except this one. */
  selected?: string | null;
  onSelect?: (language: string) => void;
  showTooltip?: boolean;
}

/**
 * The donut ring itself, with no legend. Shared by the full languages section,
 * the overview mini donut, and profile comparison — each supplies its own
 * legend, since that is the part that genuinely differs between them.
 */
export function LanguageDonutRing({
  languages,
  colorFor = (_language, i) => colorForIndex(i),
  innerRadius = '60%',
  outerRadius = '95%',
  selected = null,
  onSelect,
  showTooltip = false,
}: LanguageDonutRingProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={languages}
          dataKey="percentage"
          nameKey="language"
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          paddingAngle={2}
          stroke="none"
          isAnimationActive={false}
        >
          {languages.map((entry, i) => (
            <Cell
              key={entry.language}
              fill={colorFor(entry.language, i)}
              fillOpacity={!selected || selected === entry.language ? 1 : 0.25}
              className={onSelect ? 'cursor-pointer outline-none' : 'outline-none'}
              onClick={onSelect ? () => onSelect(entry.language) : undefined}
            />
          ))}
        </Pie>
        {showTooltip && (
          <Tooltip
            contentStyle={{
              background: '#111118',
              border: '1px solid #1e1e2e',
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value, name) => [`${Number(value).toFixed(1)}%`, name]}
          />
        )}
      </PieChart>
    </ResponsiveContainer>
  );
}

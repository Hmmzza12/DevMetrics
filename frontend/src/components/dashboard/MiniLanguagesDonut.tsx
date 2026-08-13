import type { LanguageBreakdown } from '@/api/types';
import { colorForIndex } from '@/lib/language-colors';
import { LanguageDonutRing } from './LanguageDonutRing';

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
        <LanguageDonutRing
          languages={top}
          innerRadius="65%"
          outerRadius="100%"
        />
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

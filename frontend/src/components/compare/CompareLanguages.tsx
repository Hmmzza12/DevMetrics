import { useState } from 'react';
import { motion } from 'framer-motion';
import type { CompareSide } from '@/api/types';
import { LanguageDonutRing } from '@/components/dashboard/LanguageDonutRing';
import { buildLanguageColorMap } from '@/lib/language-colors';
import { mergedLanguageRows } from '@/lib/compare-data';
import { SideNotice } from './SideNotice';

/** Legend rows shown before the "show all" toggle. */
const LEGEND_PREVIEW_COUNT = 12;

/**
 * Two donuts plus one shared legend. Colours come from a language-keyed map
 * spanning both users, so a language is the same colour in both rings and in
 * every legend row — position-based colouring would make the rings look
 * unrelated whenever the two users rank a language differently.
 */
export function CompareLanguages({
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
  const langsA = sideA.data?.languages.languages ?? null;
  const langsB = sideB.data?.languages.languages ?? null;

  const colorMap = buildLanguageColorMap([langsA ?? [], langsB ?? []]);
  const colorFor = (language: string) => colorMap.get(language) ?? '#64748b';

  const rows = mergedLanguageRows(langsA, langsB);

  // Prolific accounts carry 40+ languages, nearly all rounding to 0.0%. Showing
  // them all by default buries the rest of the page, so the long tail is
  // collapsed behind a toggle rather than dropped.
  const [showAll, setShowAll] = useState(false);
  const visibleRows = showAll ? rows : rows.slice(0, LEGEND_PREVIEW_COUNT);
  const hiddenCount = rows.length - visibleRows.length;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <DonutColumn
          side={sideA}
          progress={progressA}
          colorFor={colorFor}
        />
        <DonutColumn
          side={sideB}
          progress={progressB}
          colorFor={colorFor}
        />
      </div>

      {rows.length > 0 && (
        <motion.ul
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="flex flex-col gap-1 border-t border-border pt-4"
        >
          <li className="flex items-center gap-3 px-2 pb-1 text-xs text-muted">
            <span className="h-2.5 w-2.5 shrink-0" />
            <span className="flex-1">Language</span>
            <span className="w-16 text-right">{sideA.username}</span>
            <span className="w-16 text-right">{sideB.username}</span>
          </li>
          {visibleRows.map((row) => (
            <li
              key={row.language}
              className="flex items-center gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-surface"
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: colorFor(row.language) }}
              />
              <span className="flex-1 truncate text-text">{row.language}</span>
              <span className="w-16 text-right text-muted">
                {row.a == null ? '—' : `${row.a.toFixed(1)}%`}
              </span>
              <span className="w-16 text-right text-muted">
                {row.b == null ? '—' : `${row.b.toFixed(1)}%`}
              </span>
            </li>
          ))}

          {(hiddenCount > 0 || showAll) && (
            <li>
              <button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                className="mt-1 px-2 py-1 text-xs text-muted transition-colors hover:text-primary"
              >
                {showAll
                  ? 'Show fewer languages'
                  : `Show all ${rows.length} languages`}
              </button>
            </li>
          )}
        </motion.ul>
      )}
    </div>
  );
}

function DonutColumn({
  side,
  progress,
  colorFor,
}: {
  side: CompareSide;
  progress: number;
  colorFor: (language: string) => string;
}) {
  const languages = side.data?.languages.languages ?? [];

  return (
    <div className="flex flex-col items-center gap-3">
      <span className="text-sm font-medium text-text">{side.username}</span>
      {side.state !== 'ready' && !side.data ? (
        <SideNotice state={side.state} username={side.username} progress={progress} />
      ) : languages.length === 0 ? (
        <div className="flex h-48 items-center justify-center text-sm text-muted">
          No language data
        </div>
      ) : (
        <div className="h-48 w-48">
          <LanguageDonutRing languages={languages} colorFor={colorFor} showTooltip />
        </div>
      )}
    </div>
  );
}

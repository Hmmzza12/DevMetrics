/** Rotating palette for language slices/legends — primary/secondary first, then supporting hues. */
export const LANGUAGE_COLORS = [
  '#6366f1', // primary indigo
  '#a855f7', // secondary purple
  '#22c55e', // success green
  '#f59e0b', // amber
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#84cc16', // lime
];

export function colorForIndex(i: number): string {
  return LANGUAGE_COLORS[i % LANGUAGE_COLORS.length];
}

/**
 * Build a stable language -> colour map spanning several breakdowns.
 *
 * Comparison needs one colour per language across both donuts and the shared
 * legend; the default position-based colouring would give the same language two
 * different colours whenever the two users rank it differently. Ordering by
 * combined bytes keeps the biggest shared languages on the strongest hues.
 */
export function buildLanguageColorMap(
  breakdowns: { language: string; bytes: number }[][],
): Map<string, string> {
  const totals = new Map<string, number>();
  for (const list of breakdowns) {
    for (const { language, bytes } of list) {
      totals.set(language, (totals.get(language) ?? 0) + bytes);
    }
  }

  const ordered = [...totals.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([language]) => language);

  return new Map(ordered.map((language, i) => [language, colorForIndex(i)]));
}

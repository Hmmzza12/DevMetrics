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

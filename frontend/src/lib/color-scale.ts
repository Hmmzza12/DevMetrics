/** Shared intensity color scale — interpolates border (#1e1e2e) -> primary (#6366f1). */
export function intensityColor(count: number, max: number): string {
  if (count <= 0) return '#1e1e2e';
  const t = Math.min(1, Math.sqrt(count / Math.max(1, max)));
  const floor = 0.2 + t * 0.8;
  const from = [30, 30, 46];
  const to = [99, 102, 241];
  const rgb = from.map((c, i) => Math.round(c + (to[i] - c) * floor));
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}

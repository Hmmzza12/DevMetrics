import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useEffect, useState } from 'react';

/**
 * Counts up from 0 to `value` on mount (spec: stat cards animate on mount).
 *
 * The count-up starts at 0, so a run that never progresses leaves a *wrong*
 * number on screen rather than an unanimated one. Two cases skip the animation
 * and render the value directly: a background tab (shareable links are
 * routinely opened in one) gets no animation frames, and reduced-motion users
 * have opted out. Plain text is required in those cases — a MotionValue-driven
 * span only repaints on an animation frame, which is exactly what's missing.
 */
export function AnimatedNumber({ value }: { value: number }) {
  const [skipAnimation] = useState(
    () =>
      document.visibilityState === 'hidden' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v).toLocaleString());

  useEffect(() => {
    if (skipAnimation) return;
    const controls = animate(count, value, { duration: 1.1, ease: 'easeOut' });
    return () => controls.stop();
  }, [value, count, skipAnimation]);

  if (skipAnimation) return <span>{value.toLocaleString()}</span>;

  return <motion.span>{rounded}</motion.span>;
}

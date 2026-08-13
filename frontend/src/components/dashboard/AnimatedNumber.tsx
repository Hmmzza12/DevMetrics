import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useEffect } from 'react';

/** Counts up from 0 to `value` on mount (spec: stat cards animate on mount). */
export function AnimatedNumber({ value }: { value: number }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v).toLocaleString());

  useEffect(() => {
    const controls = animate(count, value, { duration: 1.1, ease: 'easeOut' });
    return controls.stop;
  }, [value, count]);

  return <motion.span>{rounded}</motion.span>;
}

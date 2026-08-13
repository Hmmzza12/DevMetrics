import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

/** Spec: page transitions fade + slight upward slide (y: 20 -> 0, opacity: 0 -> 1). */
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}

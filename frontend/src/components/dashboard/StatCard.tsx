import { motion, type Variants } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { AnimatedNumber } from './AnimatedNumber';

export const statGridVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

interface StatCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  suffix?: string;
}

export function StatCard({ label, value, icon: Icon, suffix }: StatCardProps) {
  return (
    <motion.div variants={cardVariants}>
      <Card>
        <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div className="font-heading text-3xl font-bold text-text">
          <AnimatedNumber value={value} />
          {suffix}
        </div>
        <div className="mt-1 text-sm text-muted">{label}</div>
      </Card>
    </motion.div>
  );
}

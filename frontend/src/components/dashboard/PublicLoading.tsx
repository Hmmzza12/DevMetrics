import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * First-load state for a public profile that hasn't been synced yet. Shows the
 * dashboard skeleton immediately plus a live progress bar driven by the sync
 * `progress` field — never a bare spinner for the several seconds a sync takes.
 */
export function PublicLoading({
  label,
  progress,
}: {
  label: string;
  progress: number;
}) {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-text">{label}</span>
          <span className="text-muted">{progress}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-surface">
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={{ width: '5%' }}
            animate={{ width: `${Math.max(5, progress)}%` }}
            transition={{ ease: 'easeOut', duration: 0.5 }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <Skeleton className="mb-3 h-9 w-9 rounded-lg" />
            <Skeleton className="mb-2 h-8 w-16" />
            <Skeleton className="h-4 w-20" />
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <Skeleton className="h-40 w-full" />
        </Card>
        <Card>
          <Skeleton className="h-40 w-full" />
        </Card>
      </div>
    </div>
  );
}

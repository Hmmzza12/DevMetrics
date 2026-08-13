import { Star, Lock } from 'lucide-react';
import type { Repo } from '@/api/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatRelativeDate } from '@/lib/format';

export function RepoCard({ repo }: { repo: Repo }) {
  return (
    <Card className="flex h-full flex-col gap-3 transition-shadow duration-200 hover:shadow-[0_0_0_1px_rgba(99,102,241,0.4),0_0_24px_rgba(99,102,241,0.15)]">
      <div className="flex items-start justify-between gap-2">
        <h3 className="truncate font-heading text-base font-semibold text-text">
          {repo.name}
        </h3>
        {repo.is_private && <Lock className="h-3.5 w-3.5 shrink-0 text-muted" />}
      </div>

      <p className="line-clamp-2 flex-1 text-sm text-muted">
        {repo.description ?? 'No description'}
      </p>

      <div className="flex items-center justify-between text-xs text-muted">
        <div className="flex items-center gap-2">
          {repo.language && <Badge>{repo.language}</Badge>}
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Star className="h-3.5 w-3.5" />
            {repo.stars}
          </span>
          <span>{formatRelativeDate(repo.updated_at)}</span>
        </div>
      </div>
    </Card>
  );
}

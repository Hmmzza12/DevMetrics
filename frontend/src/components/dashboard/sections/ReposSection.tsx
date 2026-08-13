import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { PageTransition } from '@/components/dashboard/PageTransition';
import { RepoCard } from '@/components/dashboard/RepoCard';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorCard } from '@/components/dashboard/ErrorCard';
import { useRepos } from '@/hooks/use-dashboard-data';

type SortKey = 'stars' | 'commits' | 'updated';

const gridVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
};
const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

/** Shared Repos section — used by both dashboards. */
export function ReposSection() {
  const repos = useRepos();
  const [language, setLanguage] = useState('');
  const [sort, setSort] = useState<SortKey>('stars');

  const languages = useMemo(() => {
    const set = new Set<string>();
    for (const r of repos.data?.repos ?? []) {
      if (r.language) set.add(r.language);
    }
    return [...set].sort();
  }, [repos.data]);

  const visible = useMemo(() => {
    let list = repos.data?.repos ?? [];
    if (language) list = list.filter((r) => r.language === language);

    const sorted = [...list].sort((a, b) => {
      if (sort === 'stars') return b.stars - a.stars;
      if (sort === 'commits') return b.commit_count - a.commit_count;
      const at = a.updated_at ? new Date(a.updated_at).getTime() : -Infinity;
      const bt = b.updated_at ? new Date(b.updated_at).getTime() : -Infinity;
      return bt - at;
    });
    return sorted;
  }, [repos.data, language, sort]);

  return (
    <PageTransition>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-heading text-2xl font-semibold text-text">Repos</h2>
          <div className="flex items-center gap-2">
            <Select value={language} onChange={(e) => setLanguage(e.target.value)}>
              <option value="">All languages</option>
              {languages.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </Select>
            <Select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
              <option value="stars">Sort by stars</option>
              <option value="commits">Sort by commits</option>
              <option value="updated">Sort by last updated</option>
            </Select>
          </div>
        </div>

        {repos.isLoading && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-36 w-full" />
            ))}
          </div>
        )}

        {repos.isError && (
          <ErrorCard message="Couldn't load repos." onRetry={() => repos.refetch()} />
        )}

        {repos.data && visible.length === 0 && (
          <p className="py-10 text-center text-sm text-muted">
            {repos.data.repos.length === 0
              ? 'No public repositories found for this account.'
              : 'No repos match this filter.'}
          </p>
        )}

        {repos.data && visible.length > 0 && (
          <motion.div
            variants={gridVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {visible.map((repo) => (
              <motion.div key={repo.id} variants={cardVariants}>
                <RepoCard repo={repo} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </PageTransition>
  );
}

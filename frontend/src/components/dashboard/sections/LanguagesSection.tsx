import { useState } from 'react';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import { PageTransition } from '@/components/dashboard/PageTransition';
import { LanguagesDonut } from '@/components/dashboard/LanguagesDonut';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorCard } from '@/components/dashboard/ErrorCard';
import { useLanguages } from '@/hooks/use-dashboard-data';

/** Shared Languages section — used by both the OAuth and public dashboards. */
export function LanguagesSection() {
  const [selected, setSelected] = useState<string | null>(null);
  const languages = useLanguages();
  const filtered = useLanguages(selected ?? undefined);

  return (
    <PageTransition>
      <div className="flex flex-col gap-6">
        <h2 className="font-heading text-2xl font-semibold text-text">Languages</h2>

        <Card>
          {languages.isLoading && <Skeleton className="h-64 w-full" />}
          {languages.isError && (
            <ErrorCard
              message="Couldn't load language breakdown."
              onRetry={() => languages.refetch()}
            />
          )}
          {languages.data && languages.data.languages.length > 0 && (
            <LanguagesDonut
              languages={languages.data.languages}
              selected={selected}
              onSelect={setSelected}
            />
          )}
          {languages.data && languages.data.languages.length === 0 && (
            <p className="py-10 text-center text-sm text-muted">
              No language data — this account has no public repositories with
              detected languages.
            </p>
          )}
        </Card>

        {selected && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Repos using {selected}</CardTitle>
              </CardHeader>
              {filtered.isLoading && <Skeleton className="h-20 w-full" />}
              {filtered.isError && (
                <ErrorCard
                  message="Couldn't load repos for this language."
                  onRetry={() => filtered.refetch()}
                />
              )}
              {filtered.data?.repos && filtered.data.repos.length > 0 && (
                <ul className="flex flex-col divide-y divide-border">
                  {filtered.data.repos.map((repo) => (
                    <li
                      key={repo.id}
                      className="flex items-center justify-between py-2.5 text-sm"
                    >
                      <span className="text-text">{repo.name}</span>
                      <span className="flex items-center gap-1 text-muted">
                        <Star className="h-3.5 w-3.5" />
                        {repo.stars}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {filtered.data?.repos && filtered.data.repos.length === 0 && (
                <p className="py-4 text-sm text-muted">No repos found for this language.</p>
              )}
            </Card>
          </motion.div>
        )}
      </div>
    </PageTransition>
  );
}

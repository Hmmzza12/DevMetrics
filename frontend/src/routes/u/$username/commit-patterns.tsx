import { createFileRoute } from '@tanstack/react-router';
import { CommitPatternsSection } from '@/components/dashboard/sections/CommitPatternsSection';

export const Route = createFileRoute('/u/$username/commit-patterns')({
  component: CommitPatternsSection,
});

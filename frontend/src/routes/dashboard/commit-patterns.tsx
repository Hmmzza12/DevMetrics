import { createFileRoute } from '@tanstack/react-router';
import { CommitPatternsSection } from '@/components/dashboard/sections/CommitPatternsSection';

export const Route = createFileRoute('/dashboard/commit-patterns')({
  component: CommitPatternsSection,
});

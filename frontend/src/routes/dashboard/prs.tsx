import { createFileRoute } from '@tanstack/react-router';
import { PRsSection } from '@/components/dashboard/sections/PRsSection';

export const Route = createFileRoute('/dashboard/prs')({
  component: PRsSection,
});

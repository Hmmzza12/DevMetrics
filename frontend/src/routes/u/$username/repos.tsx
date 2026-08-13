import { createFileRoute } from '@tanstack/react-router';
import { ReposSection } from '@/components/dashboard/sections/ReposSection';

export const Route = createFileRoute('/u/$username/repos')({
  component: ReposSection,
});

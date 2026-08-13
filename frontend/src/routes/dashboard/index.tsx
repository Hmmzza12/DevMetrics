import { createFileRoute } from '@tanstack/react-router';
import { OverviewSection } from '@/components/dashboard/sections/OverviewSection';

export const Route = createFileRoute('/dashboard/')({
  component: OverviewSection,
});

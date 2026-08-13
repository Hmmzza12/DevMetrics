import { createFileRoute } from '@tanstack/react-router';
import { HeatmapSection } from '@/components/dashboard/sections/HeatmapSection';

export const Route = createFileRoute('/dashboard/heatmap')({
  component: HeatmapSection,
});

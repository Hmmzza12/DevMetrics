import { createFileRoute } from '@tanstack/react-router';
import { HeatmapSection } from '@/components/dashboard/sections/HeatmapSection';

export const Route = createFileRoute('/u/$username/heatmap')({
  component: HeatmapSection,
});

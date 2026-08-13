import { createFileRoute } from '@tanstack/react-router';
import { LanguagesSection } from '@/components/dashboard/sections/LanguagesSection';

export const Route = createFileRoute('/u/$username/languages')({
  component: LanguagesSection,
});

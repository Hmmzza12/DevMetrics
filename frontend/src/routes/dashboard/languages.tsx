import { createFileRoute } from '@tanstack/react-router';
import { LanguagesSection } from '@/components/dashboard/sections/LanguagesSection';

export const Route = createFileRoute('/dashboard/languages')({
  component: LanguagesSection,
});

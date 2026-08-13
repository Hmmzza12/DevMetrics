import { motion } from 'framer-motion';
import type { LanguageBreakdown } from '@/api/types';
import { colorForIndex } from '@/lib/language-colors';
import { cn } from '@/lib/utils';
import { LanguageDonutRing } from './LanguageDonutRing';

const legendVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const legendItemVariants = {
  hidden: { opacity: 0, x: -8 },
  show: { opacity: 1, x: 0 },
};

interface LanguagesDonutProps {
  languages: LanguageBreakdown[];
  selected: string | null;
  onSelect: (language: string | null) => void;
}

export function LanguagesDonut({ languages, selected, onSelect }: LanguagesDonutProps) {
  function toggle(language: string) {
    onSelect(selected === language ? null : language);
  }

  return (
    <div className="flex flex-col items-center gap-8 sm:flex-row sm:items-center">
      <div className="h-64 w-64 shrink-0">
        <LanguageDonutRing
          languages={languages}
          selected={selected}
          onSelect={toggle}
          showTooltip
        />
      </div>

      <motion.ul
        variants={legendVariants}
        initial="hidden"
        animate="show"
        className="flex w-full flex-col gap-1.5"
      >
        {languages.map((lang, i) => (
          <motion.li
            key={lang.language}
            variants={legendItemVariants}
            onClick={() => toggle(lang.language)}
            className={cn(
              'flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-surface',
              selected === lang.language && 'bg-primary/10',
            )}
          >
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: colorForIndex(i) }}
            />
            <span
              className={cn(
                'flex-1 text-text',
                selected && selected !== lang.language && 'text-muted',
              )}
            >
              {lang.language}
            </span>
            <span className="text-muted">{lang.percentage.toFixed(1)}%</span>
          </motion.li>
        ))}
      </motion.ul>
    </div>
  );
}

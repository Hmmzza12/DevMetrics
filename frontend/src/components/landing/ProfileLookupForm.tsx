import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, GitCompare, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { normalizeUsername, isValidUsername } from '@/lib/username';

/**
 * Landing-page primary action: look up any public GitHub profile without
 * logging in. Accepts a bare username or a pasted profile URL (stripped to the
 * username automatically), submits on Enter, and shows inline validation.
 *
 * Comparison is a secondary affordance underneath — the single lookup stays the
 * primary call to action.
 */
export function ProfileLookupForm() {
  const navigate = useNavigate();
  const [value, setValue] = useState('');
  const [second, setSecond] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState(false);

  /** Strip a pasted full URL down to the username on the fly. */
  function clean(raw: string): string {
    const looksLikeUrl = /github\.com/i.test(raw) || /^https?:/i.test(raw);
    return looksLikeUrl ? normalizeUsername(raw) : raw;
  }

  function submit(e: React.FormEvent) {
    e.preventDefault(); // native form submit → Enter and click both work

    const username = normalizeUsername(value);
    if (!username) {
      setError('Enter a GitHub username.');
      return;
    }
    if (!isValidUsername(username)) {
      setError("That doesn't look like a valid GitHub username.");
      return;
    }

    if (!compareMode) {
      navigate({ to: '/u/$username', params: { username } });
      return;
    }

    const other = normalizeUsername(second);
    if (!other) {
      setError('Enter a second username to compare.');
      return;
    }
    if (!isValidUsername(other)) {
      setError("The second username doesn't look valid.");
      return;
    }
    if (other.toLowerCase() === username.toLowerCase()) {
      setError('Enter two different usernames.');
      return;
    }

    navigate({
      to: '/compare/$userA/$userB',
      params: { userA: username, userB: other },
    });
  }

  return (
    <form className="w-full max-w-xl" onSubmit={submit}>
      <UsernameField
        value={value}
        onChange={(v) => {
          setValue(clean(v));
          if (error) setError(null);
        }}
        invalid={!!error}
        ariaLabel="GitHub username or profile URL"
        action={
          !compareMode ? (
            <Button type="submit" className="m-1 shrink-0">
              Analyze
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : null
        }
      />

      <AnimatePresence initial={false}>
        {compareMode && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="pt-2">
              <UsernameField
                value={second}
                onChange={(v) => {
                  setSecond(clean(v));
                  if (error) setError(null);
                }}
                invalid={!!error}
                ariaLabel="Second GitHub username to compare"
                placeholder="second username"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button type="submit" className="shrink-0">
                Compare
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCompareMode(false);
                  setSecond('');
                  setError(null);
                }}
              >
                <X className="h-4 w-4" />
                Cancel
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && <p className="mt-2 pl-1 text-sm text-red-400">{error}</p>}

      {!compareMode && (
        <button
          type="button"
          onClick={() => setCompareMode(true)}
          className="mt-3 inline-flex items-center gap-1.5 pl-1 text-sm text-muted transition-colors hover:text-primary"
        >
          <GitCompare className="h-3.5 w-3.5" />
          Compare two profiles
        </button>
      )}
    </form>
  );
}

function UsernameField({
  value,
  onChange,
  invalid,
  ariaLabel,
  placeholder = 'username',
  action,
}: {
  value: string;
  onChange: (value: string) => void;
  invalid: boolean;
  ariaLabel: string;
  placeholder?: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      className={`flex items-stretch overflow-hidden rounded-xl border bg-surface/80 backdrop-blur-sm transition-colors focus-within:border-primary ${
        invalid ? 'border-red-500/60' : 'border-border'
      }`}
    >
      <span className="hidden items-center pl-4 pr-1 font-mono text-sm text-muted sm:flex">
        github.com/
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        aria-label={ariaLabel}
        className="min-w-0 flex-1 bg-transparent px-4 py-3 text-text placeholder:text-muted focus:outline-none sm:pl-1"
      />
      {action}
    </div>
  );
}

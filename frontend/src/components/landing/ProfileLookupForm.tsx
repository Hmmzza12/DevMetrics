import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { normalizeUsername, isValidUsername } from '@/lib/username';

/**
 * Landing-page primary action: look up any public GitHub profile without
 * logging in. Accepts a bare username or a pasted profile URL (stripped to the
 * username automatically), submits on Enter, and shows inline validation.
 */
export function ProfileLookupForm() {
  const navigate = useNavigate();
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    // Strip a pasted full URL down to the username on the fly.
    const looksLikeUrl = /github\.com/i.test(raw) || /^https?:/i.test(raw);
    setValue(looksLikeUrl ? normalizeUsername(raw) : raw);
    if (error) setError(null);
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
    navigate({ to: '/u/$username', params: { username } });
  }

  return (
    <form className="w-full max-w-xl" onSubmit={submit}>
      <div
        className={`flex items-stretch overflow-hidden rounded-xl border bg-surface/80 backdrop-blur-sm transition-colors focus-within:border-primary ${
          error ? 'border-red-500/60' : 'border-border'
        }`}
      >
        <span className="hidden items-center pl-4 pr-1 font-mono text-sm text-muted sm:flex">
          github.com/
        </span>
        <input
          value={value}
          onChange={handleChange}
          placeholder="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          aria-label="GitHub username or profile URL"
          className="min-w-0 flex-1 bg-transparent px-4 py-3 text-text placeholder:text-muted focus:outline-none sm:pl-1"
        />
        <Button type="submit" className="m-1 shrink-0">
          Analyze
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
      {error && <p className="mt-2 pl-1 text-sm text-red-400">{error}</p>}
    </form>
  );
}

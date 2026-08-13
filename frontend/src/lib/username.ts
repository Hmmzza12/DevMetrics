// GitHub username rules: 1–39 chars, alphanumeric or single hyphens, no
// leading/trailing hyphen and no consecutive hyphens. Mirrors the backend.
const GITHUB_USERNAME_RE = /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/;

/** Strip a pasted profile URL down to a bare username. */
export function normalizeUsername(input: string): string {
  let s = (input ?? '').trim();
  s = s.replace(/^https?:\/\//i, '').replace(/^www\./i, '');
  s = s.replace(/^github\.com\//i, '');
  s = s.split(/[/?#]/)[0] ?? '';
  return s;
}

export function isValidUsername(username: string): boolean {
  return GITHUB_USERNAME_RE.test(username);
}

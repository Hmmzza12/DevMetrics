import {
  LayoutGrid,
  CalendarDays,
  Languages,
  Activity,
  GitPullRequest,
  FolderGit2,
  type LucideIcon,
} from 'lucide-react';

export interface NavSection {
  key: string;
  label: string;
  icon: LucideIcon;
  /** Route pattern for the OAuth dashboard. */
  authTo: string;
  /** Route pattern for the public dashboard (`$username` param). */
  publicTo: string;
}

/**
 * Sidebar / bottom-tab sections, in spec order. Both route patterns are kept as
 * literals so TanStack Router's typed `Link` stays fully type-checked in either
 * mode — the same nav components serve `/dashboard` and `/u/:username`.
 */
export const NAV_SECTIONS: NavSection[] = [
  { key: 'overview', label: 'Overview', icon: LayoutGrid, authTo: '/dashboard', publicTo: '/u/$username' },
  { key: 'heatmap', label: 'Heatmap', icon: CalendarDays, authTo: '/dashboard/heatmap', publicTo: '/u/$username/heatmap' },
  { key: 'languages', label: 'Languages', icon: Languages, authTo: '/dashboard/languages', publicTo: '/u/$username/languages' },
  { key: 'commit-patterns', label: 'Commit Patterns', icon: Activity, authTo: '/dashboard/commit-patterns', publicTo: '/u/$username/commit-patterns' },
  { key: 'prs', label: 'PRs', icon: GitPullRequest, authTo: '/dashboard/prs', publicTo: '/u/$username/prs' },
  { key: 'repos', label: 'Repos', icon: FolderGit2, authTo: '/dashboard/repos', publicTo: '/u/$username/repos' },
];

export type NavMode = 'auth' | 'public';

/** The concrete path (for active-state matching) for a section in a given mode. */
export function concretePath(
  section: NavSection,
  mode: NavMode,
  username?: string,
): string {
  return mode === 'public'
    ? section.publicTo.replace('$username', username ?? '')
    : section.authTo;
}

/** The overview (root) path for a mode — matched exactly, not by prefix. */
export function rootPath(mode: NavMode, username?: string): string {
  return mode === 'public' ? `/u/${username ?? ''}` : '/dashboard';
}

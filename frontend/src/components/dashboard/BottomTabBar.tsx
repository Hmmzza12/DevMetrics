import { Link, useRouterState } from '@tanstack/react-router';
import {
  NAV_SECTIONS,
  concretePath,
  rootPath,
  type NavMode,
} from './nav-items';

interface BottomTabBarProps {
  mode?: NavMode;
  username?: string;
}

/** Mobile-only bottom tab bar (spec: "bottom tab bar on mobile"). */
export function BottomTabBar({ mode = 'auth', username }: BottomTabBarProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const root = rootPath(mode, username);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-border bg-surface/95 backdrop-blur-sm md:hidden">
      {NAV_SECTIONS.map((item) => {
        const path = concretePath(item, mode, username);
        const isActive = path === root ? pathname === root : pathname.startsWith(path);
        const Icon = item.icon;
        const linkProps =
          mode === 'public'
            ? { to: item.publicTo, params: { username } }
            : { to: item.authTo };
        return (
          <Link
            key={item.key}
            {...linkProps}
            aria-label={item.label}
            title={item.label}
            className="flex flex-1 flex-col items-center gap-1 py-3 text-muted data-[active=true]:text-primary"
            data-active={isActive}
          >
            <Icon className="h-5 w-5" />
          </Link>
        );
      })}
    </nav>
  );
}

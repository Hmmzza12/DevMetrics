import { Link, useRouterState } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import {
  NAV_SECTIONS,
  concretePath,
  rootPath,
  type NavMode,
} from './nav-items';

interface SidebarProps {
  mode?: NavMode;
  username?: string;
}

/** Desktop-only sidebar. Active item gets a sliding background via a shared layoutId. */
export function Sidebar({ mode = 'auth', username }: SidebarProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const root = rootPath(mode, username);

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-surface/50 p-4 md:flex">
      <div className="mb-8 px-2 font-heading text-lg font-bold text-text">
        DevMetrics
      </div>
      <nav className="flex flex-col gap-1">
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
              className="relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors data-[active=true]:text-text"
              data-active={isActive}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active-pill"
                  className="absolute inset-0 rounded-lg bg-primary/10"
                  transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                />
              )}
              <Icon className="relative z-10 h-4 w-4" />
              <span className="relative z-10">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

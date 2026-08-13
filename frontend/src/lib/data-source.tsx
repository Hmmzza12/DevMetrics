import { createContext, useContext, type ReactNode } from 'react';

/**
 * Which backend the dashboard section components read from. `auth` uses the
 * logged-in user's endpoints; `public` uses the username-scoped public API.
 * The section components themselves are identical in both modes — the hooks
 * read this context to choose the endpoint and query key.
 */
export type DataSource =
  | { mode: 'auth' }
  | { mode: 'public'; username: string };

const DataSourceContext = createContext<DataSource>({ mode: 'auth' });

export function DataSourceProvider({
  value,
  children,
}: {
  value: DataSource;
  children: ReactNode;
}) {
  return (
    <DataSourceContext.Provider value={value}>
      {children}
    </DataSourceContext.Provider>
  );
}

export function useDataSource(): DataSource {
  return useContext(DataSourceContext);
}

/**
 * Namespaced query key. Public keys are prefixed with the username so different
 * profiles (and the auth user) never share cached data.
 */
export function scopedKey(
  src: DataSource,
  ...parts: readonly unknown[]
): unknown[] {
  return src.mode === 'public'
    ? ['public', src.username, ...parts]
    : [...parts];
}

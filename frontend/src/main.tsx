import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import './index.css';
import { queryClient } from '@/lib/query-client';
import { LenisProvider } from '@/lib/lenis-provider';
import { routeTree } from './routeTree.gen';

const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <LenisProvider>
        <RouterProvider router={router} />
      </LenisProvider>
    </QueryClientProvider>
  </StrictMode>,
);

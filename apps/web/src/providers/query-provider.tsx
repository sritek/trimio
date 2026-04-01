/**
 * TanStack Query Provider
 * Based on: .cursor/rules/14-frontend-implementation.mdc lines 686-718
 */

'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, useEffect } from 'react';

// Global query client instance for access outside React components (e.g., logout)
let globalQueryClient: QueryClient | null = null;

export function getQueryClient(): QueryClient | null {
  return globalQueryClient;
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            gcTime: 5 * 60 * 1000, // 5 minutes
            retry: 1,
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: 0,
          },
        },
      })
  );

  // Set global reference for access outside React
  useEffect(() => {
    globalQueryClient = queryClient;
    return () => {
      globalQueryClient = null;
    };
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

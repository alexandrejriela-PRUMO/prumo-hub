import { QueryClient } from '@tanstack/react-query';

let _queryClientInstance = null;

export const getQueryClient = () => {
  if (!_queryClientInstance) {
    _queryClientInstance = new QueryClient({
      defaultOptions: {
        queries: {
          refetchOnWindowFocus: false,
          retry: 1,
          staleTime: 30000,
        },
      },
    });
  }
  return _queryClientInstance;
};

// backward compat
export const queryClientInstance = getQueryClient();
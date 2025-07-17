import { ThemeProvider } from '@geti/ui/theme';
import { broadcastQueryClient } from '@tanstack/query-broadcast-client-experimental';
import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router';

import { WebRTCConnectionProvider } from './components/stream/web-rtc-connection-provider';
import { ZoomProvider } from './components/zoom/zoom';
import { router } from './router';
import { SelectedDataProvider } from './routes/data-collection/provider';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            gcTime: 30 * 60 * 1000,
            staleTime: 5 * 60 * 1000,
            networkMode: 'always',
        },
        mutations: {
            networkMode: 'always',
        },
    },
    mutationCache: new MutationCache({
        onSuccess: () => {
            queryClient.invalidateQueries();
        },
    }),
});

// Sync our server state with all browser tabs
broadcastQueryClient({ queryClient, broadcastChannel: 'geti-edge' });

export const Providers = () => {
    return (
        <QueryClientProvider client={queryClient}>
            <ThemeProvider router={router}>
                <WebRTCConnectionProvider>
                    <SelectedDataProvider>
                        <ZoomProvider>
                            <RouterProvider router={router} />
                        </ZoomProvider>
                    </SelectedDataProvider>
                </WebRTCConnectionProvider>
            </ThemeProvider>
        </QueryClientProvider>
    );
};

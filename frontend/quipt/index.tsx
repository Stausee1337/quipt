import { StrictMode, ReactNode } from 'react';
import { hydrateRoot } from 'react-dom/client';

import { RouterProvider, createBrowserRouter } from 'react-router';
import { QueryClientProvider } from '@tanstack/react-query';

import { AuthenticationContextObj, createAuthenticationContext, queryClient } from 'quipt/client';
import { ResponsiveBreakpointProivder } from 'quipt/responsive';
import routes from 'quipt/routes';

import './index.css';

// const root = document.createElement('div');
// root.className = 'h-svh w-svw flex relative text-foreground bg-background';
// document.body.append(root);

function ClientProvider({ children }: { children: ReactNode }) {
    const authenticationContext = createAuthenticationContext();
    return (
        <ResponsiveBreakpointProivder>
            <QueryClientProvider client={queryClient}>
                <AuthenticationContextObj.Provider value={authenticationContext}>
                    {children}
                </AuthenticationContextObj.Provider>
            </QueryClientProvider>
        </ResponsiveBreakpointProivder>
    );
}

const router = createBrowserRouter(routes);

hydrateRoot(
    document.getElementById('root')!,
    <StrictMode>
        <ClientProvider>
            <RouterProvider router={router} />
        </ClientProvider>
    </StrictMode>,
);

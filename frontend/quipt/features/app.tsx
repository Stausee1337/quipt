import { type JSX, type ReactNode } from 'react';

import { Outlet } from 'react-router';

import { useAuthentication } from 'quipt/client';
import { Header } from 'quipt/components/HeaderElement';
import { SideMenu } from 'quipt/components/MenuElement';
import { useBreakpoints } from 'quipt/responsive';

import { QueryClientProvider } from '@tanstack/react-query';

import { AuthenticationContextObj, createAuthenticationContext, queryClient } from 'quipt/client';
import { ResponsiveBreakpointProivder } from 'quipt/responsive';

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

export function App(): JSX.Element {
    const authenticationContext = import.meta.env.SSR ? undefined : useAuthentication();
    const breakpoints = import.meta.env.SSR ? undefined : useBreakpoints();

    const content = (
        <div className="relative z-0 flex min-h-0 w-full flex-1 flex-col">
            {breakpoints && !breakpoints?.md && <Header />}
            <div className="relative z-0 flex min-h-0 w-full flex-1">
                {breakpoints?.md && authenticationContext?.isLoggedIn && <SideMenu />}
                <Outlet />
            </div>
        </div>
    );

    if (typeof window !== 'undefined') return <ClientProvider>{content}</ClientProvider>;
    return content;
}

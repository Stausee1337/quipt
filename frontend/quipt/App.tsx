import { type JSX } from 'react';

import { Outlet } from 'react-router';

import { useAuthentication } from 'quipt/client';
import { Header } from 'quipt/components/HeaderElement';
import { SideMenu } from 'quipt/components/MenuElement';
import { useBreakpoints } from 'quipt/responsive';
import { HydrationBoundary } from 'quipt/components/hydration-boundary';

export function App(): JSX.Element {
    const authenticationContext = import.meta.env.SSR ? undefined : useAuthentication();
    const breakpoints = import.meta.env.SSR ? undefined : useBreakpoints();

    return (
        <div className="relative z-0 flex min-h-0 w-full flex-1 flex-col">
            <HydrationBoundary>
                {breakpoints && !breakpoints?.md && <Header />}
                <div className="relative z-0 flex min-h-0 w-full flex-1">
                    {breakpoints?.md && authenticationContext?.isLoggedIn && <SideMenu />}
                    <Outlet />
                </div>
            </HydrationBoundary>
        </div>
    );
}

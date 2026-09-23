import { type JSX } from 'react';

import { Outlet } from 'react-router';

import { useAuthentication } from 'quipt/client';
import { Header } from 'quipt/components/HeaderElement';
import { SideMenu } from 'quipt/components/MenuElement';
import { useBreakpoints } from 'quipt/responsive';

export function App(): JSX.Element {
    const authenticationContext = import.meta.env.SSR ? undefined : useAuthentication();
    const breakpoints = import.meta.env.SSR ? undefined : useBreakpoints();

    return (
        <div className="relative z-0 flex min-h-0 w-full flex-1 flex-col">
            {breakpoints && !breakpoints?.md && <Header />}
            <div className="relative z-0 flex min-h-0 w-full flex-1">
                {breakpoints?.md && authenticationContext?.isLoggedIn && <SideMenu />}
                <h1 className="text-heading-1">Hello, World!</h1>
                <Outlet />
            </div>
        </div>
    );
}

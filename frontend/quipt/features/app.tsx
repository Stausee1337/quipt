import { type JSX, type ReactNode } from 'react';

import { Outlet } from 'react-router';

import { useAuthentication } from 'quipt/client';
import { Header } from 'quipt/components/HeaderElement';
import { SideMenu } from 'quipt/components/MenuElement';
import { BigButton, Button } from 'quipt/components/button';
import { BigInput, Input } from 'quipt/components/input';
import { Icon } from 'quipt/components/icon';
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

export function Home(): JSX.Element {
    return (
        <div className="p-1">
            <div>
                <Button variant="primary">Button</Button>
                <Button variant="primary" disabled>
                    Button
                </Button>
                <Button variant="secondary">Button</Button>
                <Button variant="secondary" disabled>
                    Button
                </Button>
                <Button variant="danger">Button</Button>
                <Button variant="danger" disabled>
                    Button
                </Button>
            </div>
            <div>
                <BigButton variant="primary">Button</BigButton>
                <BigButton variant="primary" disabled>
                    Button
                </BigButton>
                <BigButton variant="secondary">Button</BigButton>
                <BigButton variant="secondary" disabled>
                    Button
                </BigButton>
                <BigButton variant="danger">Button</BigButton>
                <BigButton variant="danger" disabled>
                    Button
                </BigButton>
            </div>
            <div>
                <Input placeholder="Placeholder" />
                <BigInput placeholder="Placeholder" />
            </div>
            <div>
                <Icon iconName="exclamation-circle-fill" />
                <Icon iconName="quipt-logo" />
                <Icon iconName="quipt-logo" className="h-16 w-auto" />
            </div>
        </div>
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

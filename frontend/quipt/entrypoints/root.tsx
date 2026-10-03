import { type JSX, type ReactNode } from 'react';


import { Head, Scripts } from 'quipt/components/ssr';
import { ErrorBoundary } from 'quipt/components/error-boundary';
import { FlowLink, signinFlow, signupFlow } from 'quipt/features/auth';
import { defineEntry } from '../../shared/routing';

export default defineEntry({
    path: '',
    Component: Root,
    Layout,
    ErrorBoundary,
});

function Root() {
    return (
        <div className="p-1 flex flex-col gap-x-1">
            <h1 className="text-heading-1">TODO: Landing Page</h1>
            <FlowLink href={signinFlow} continueTo="/app">Anmelden</FlowLink>
            <FlowLink href={signupFlow} continueTo="/app">Konto erstellen</FlowLink>
        </div>
    );
}

function Layout({ children }: { children: ReactNode }): JSX.Element {
    return (
        <html>
            <Head />
            <body>
                <div className="text-foreground bg-background relative flex h-svh w-svw">
                    {children}
                </div>
                <Scripts />
            </body>
        </html>
    );
}


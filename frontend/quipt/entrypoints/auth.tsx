import { type JSX, type ReactNode } from 'react';

import { Head, Scripts } from 'quipt/components/ssr';
import { Authentication } from 'quipt/features/auth';
import { defineEntry } from '../../shared/routing';

export default defineEntry({
    path: 'auth',
    Layout,
    children: [{ path: 'identify', Component: Authentication }],
});

function Layout({ children }: { children: ReactNode }): JSX.Element {
    return (
        <html>
            <Head />
            <body>
                <div className="text-foreground bg-background relative flex h-svh w-svw">
                    <div className="relative z-0 flex min-h-0 w-full flex-1 flex-wrap">
                        {children}
                    </div>
                </div>
                <Scripts />
            </body>
        </html>
    );
}

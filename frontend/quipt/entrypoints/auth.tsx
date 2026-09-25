import { type JSX, ReactNode } from 'react';

import { Head, Scripts } from 'quipt/components/ssr';
import { Authentication } from 'quipt/features/authentication';
import { defineEntry } from '../../shared/routing';

export default defineEntry({
    path: 'auth/:formType',
    Layout,
    Component: Authentication,
});

function Layout({ children }: { children: ReactNode }): JSX.Element {
    return (
        <html>
            <Head/>
            <body>
                <div className="text-foreground bg-background relative flex h-svh w-svw">
                    <div className="relative z-0 flex min-h-0 w-full flex-1">
                    { children }
                    </div>
                </div>
                <Scripts/>
            </body>
        </html>
    );
}


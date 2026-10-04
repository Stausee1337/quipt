import { type JSX, type ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }): JSX.Element {
    return <>{children}</>;
}

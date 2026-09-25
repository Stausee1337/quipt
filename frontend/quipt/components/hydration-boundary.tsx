import { type JSX, ReactNode, useState, useEffect } from 'react';

export function HydrationBoundary({ children }: { children: ReactNode }): JSX.Element {
    const [isHydrated, setIsHydrated] = useState(false);

    useEffect(() => {
        setIsHydrated(true);
    }, []);

    return <>{isHydrated ? children : undefined}</>;
}

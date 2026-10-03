import { type JSX } from 'react';

import { Outlet } from 'react-router';

import { SideNav } from 'quipt/components/side-nav';
import { useBreakpoints } from 'quipt/responsive';

export function App(): JSX.Element {
    const breakpoints = useBreakpoints();

    return (
        <div className="relative z-0 flex min-h-0 w-full flex-1 flex-col">
            {!breakpoints.md && null}
            <div className="relative z-0 flex min-h-0 w-full flex-1">
                <div className="absolute top-0 bottom-0 left-0">
                    {breakpoints.md && <SideNav/>}
                </div>
                <Outlet />
            </div>
        </div>
    );
}

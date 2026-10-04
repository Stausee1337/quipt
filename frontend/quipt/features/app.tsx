import { type JSX } from 'react';

import { type RouteObject, useRoutes, useLocation, useNavigate } from 'react-router';

import { SideNav } from 'quipt/components/side-nav';
import { Modal } from 'quipt/components/modal';
import { useBreakpoints } from 'quipt/responsive';
import { NewScriptModal } from 'quipt/features/new-script';

const normalRoutes = [
    { path: '', element: <p>Home</p> },
    { path: 'script/:scriptID', element: <p>Skript</p> },
    { path: 'practice/:someting', element: <p>Üben</p> },
];

const modalRoutes = [
    { path: 'new-script', Component: NewScriptModal },
    { path: 'practice-start', element: <p>Üben Starten</p> },
] as RouteObject[];

export function App(): JSX.Element {
    const breakpoints = useBreakpoints();

    const location = useLocation();
    const navigate = useNavigate();

    return (
        <div className="relative z-0 flex min-h-0 w-full flex-1 flex-col">
            {!breakpoints.sm && null}
            <div className="relative z-0 flex min-h-0 w-full flex-1">
                <div className="absolute top-0 bottom-0 left-0">
                    {breakpoints.sm && <SideNav />}
                </div>
                {useRoutes(normalRoutes, location.state?.backgroundLocation)}
                <Modal.Root
                    open={location.state?.backgroundLocation !== undefined}
                    onOpenChange={open => !open && navigate(-1)}>
                    <Modal.Portal>
                        <Modal.Backdrop />
                        <Modal.Popup>{useRoutes(modalRoutes)}</Modal.Popup>
                    </Modal.Portal>
                </Modal.Root>
            </div>
        </div>
    );
}

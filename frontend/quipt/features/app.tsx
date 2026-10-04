import { type JSX } from 'react';

import { type RouteObject, useRoutes, useLocation, useNavigate } from 'react-router';
import { Dialog } from '@base-ui/react';

import { SideNav } from 'quipt/components/side-nav';
import { Modal } from 'quipt/components/modal';
import { useBreakpoints } from 'quipt/responsive';
import { BigButton } from 'quipt/components/button';
import { Icon } from 'quipt/components/icon';

// Its not like you can *only append* to the current pathname, you just have to *remain within the 
// base of /app*.
const normalRoutes = [
    { path: '', element: <p>Home</p> },
    { path: 'script/:scriptID', element: <p>Skript</p> },
    { path: 'practice/:someting', element: <p>Üben</p> },

];

const modalRoutes = [
    { path: 'new-script', Component: NewScriptModal },
    { path: 'practice-start', element: <p>Üben Starten</p> },
] as RouteObject[];

function NewScriptModal(): JSX.Element {
    return (
        <Modal 
            className="w-170"
            heading="Datei in Skript konvertieren">
            <div className="p-4 rounded-2xl flex gap-x-3 bg-background border border-accent-30 justify-center items-center cursor-pointer">
                <Icon iconName="upload-arrow" className="w-22.5 h-auto text-accent-100"/>
                <Modal.Description className="text-info text-accent-100 w-65">
                    Klicken Sie in diese Fläche order ziehen Sie eine Datei auf diese Fläche, um 
                    sie in ein Skript zu konvertieren
                </Modal.Description>
            </div>
            <div className="flex justify-between">
                <BigButton variant="secondary"
                    render={<Dialog.Close/>}>
                    Abbrechen
                </BigButton>
                <BigButton variant="primary">
                    Weiter
                </BigButton>
            </div>
        </Modal>
    );
}

// { path: '*', element: <Navigate to="/app"/> }
//
// function ModalContent(): JSX.Element {
//     return (
//         <Dialog.Popup className="fixed top-1/2 left-1/2 -mt-8 flex w-120 max-w-[calc(100vw-3rem)] -translate-x-1/2 -translate-y-1/2 flex-col gap-2 bg-accent-20 p-4 text-foreground shadow-xl/50 rounded-2xl transition-[scale,opacity] duration-100 ease-out data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-starting-style:scale-[0.98] data-starting-style:opacity-0">
//             <div className="flex justify-between items-center">
//                 <Dialog.Title className="text-heading-2">Test Heading</Dialog.Title>
//                 <Dialog.Close className="cursor-pointer" aria-label="Close">
//                     <Icon iconName="x" className="w-7.5 h-7.5" aria-hidden="true"/>
//                 </Dialog.Close>
//             </div>
//             <div className="flex flex-col gap-1">
//                 { useRoutes(modalRoutes) }
//             </div>
//         </Dialog.Popup>
//     );
// }

export function App(): JSX.Element {
    const breakpoints = useBreakpoints();

    const location = useLocation();
    const navigate = useNavigate();

    console.log(location.state?.backgroundLocation);

    return (
        <div className="relative z-0 flex min-h-0 w-full flex-1 flex-col">
            {!breakpoints.sm && null}
            <div className="relative z-0 flex min-h-0 w-full flex-1">
                <div className="absolute top-0 bottom-0 left-0">
                    {breakpoints.sm && <SideNav/>}
                </div>
                { useRoutes(normalRoutes, location.state?.backgroundLocation) }
                <Modal.Root open={location.state?.backgroundLocation !== undefined} onOpenChange={open => !open && navigate(-1)}>
                    <Modal.Portal>
                        <Modal.Backdrop/>
                        <Modal.Popup>
                            { useRoutes(modalRoutes) }
                        </Modal.Popup>
                    </Modal.Portal>
                </Modal.Root>
            </div>
        </div>
    );
}

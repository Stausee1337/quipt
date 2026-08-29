import { createSignal } from 'solid-js';

import { useAuthentication } from 'quipt/client';
import { SideMenuModal } from 'quipt/components/MenuElement';
import QuiptLogo from 'quipt/components/Quipt-Logo';
import { IconButton } from 'quipt/components/basics';

export function Header() {
    const authentication = useAuthentication()!;

    const [isSideMenuOpen, setIsSideMenuOpen] = createSignal(false);

    return (
        <>
            <div class="border-lighter1 relative z-10 flex h-15 items-center border-b p-4">
                {authentication.isLoggedIn() ? (
                    <IconButton icon="list" onClick={() => setIsSideMenuOpen(true)} />
                ) : null}
                <QuiptLogo class="mx-auto" />
            </div>
            <SideMenuModal isOpen={isSideMenuOpen()} onClose={() => setIsSideMenuOpen(false)} />
        </>
    );
}

import { createSignal } from 'solid-js';

import { useAuthentication } from 'quipt/client';
import { SideMenuModal } from 'quipt/components/MenuElement';
import QuiptLogo from 'quipt/components/Quipt-Logo';

export function Header() {
    const authentication = useAuthentication()!;

    const [isSideMenuOpen, setIsSideMenuOpen] = createSignal(false);

    return (
        <>
            <div class="relative z-10 p-4 flex border-b border-lighter1 h-15 items-center">
                {authentication.isLoggedIn() ? (
                    <button class="h-10 w-10 text-2xl cursor-pointer" onClick={() => setIsSideMenuOpen(true)}>
                        <i class="bi bi-list" />
                    </button>
                ) : null}
                <QuiptLogo class="mx-auto"/>
            </div>
            <SideMenuModal isOpen={isSideMenuOpen()} onClose={() => setIsSideMenuOpen(false)} />
        </>
    );
}

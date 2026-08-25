import { createSignal } from 'solid-js';

import { useAuthentication } from 'quipt/client';
import { SideMenuModal } from 'quipt/components/MenuElement';
import QuiptLogo from 'quipt/components/Quipt-Logo';

export function Header() {
    const authentication = useAuthentication()!;

    const [isSideMenuOpen, setIsSideMenuOpen] = createSignal(false);

    return (
        <>
            <div class="header-element">
                {authentication.isLoggedIn() ? (
                    <button onClick={() => setIsSideMenuOpen(true)}>
                        <i class="bi bi-list" />
                    </button>
                ) : null}
                <QuiptLogo />
            </div>
            <SideMenuModal isOpen={isSideMenuOpen()} onClose={() => setIsSideMenuOpen(false)} />
        </>
    );
}

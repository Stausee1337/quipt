import { getOwner } from 'solid-js';

import { useAuthentication } from 'quipt/client';
import { MenuElement } from 'quipt/components/MenuElement';
import QuiptLogo from 'quipt/components/Quipt-Logo';
import { DialogManager } from 'quipt/dialog';

export function HeaderElement() {
    const authentication = useAuthentication()!;
    const owner = getOwner();

    function openMenu() {
        DialogManager.openSideMenu(MenuElement, owner);
    }

    return (
        <div class="header-element">
            {authentication.isLoggedIn() ? (
                <button onClick={openMenu}>
                    <i class="bi bi-list" />
                </button>
            ) : null}
            <QuiptLogo />
        </div>
    );
}

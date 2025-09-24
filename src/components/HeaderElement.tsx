import { getOwner } from "solid-js";
import { DialogManager } from "../dialog";
import { useAuthentication } from "../backend";
import QuiptLogo from "./Quipt-Logo";
import { MenuElement } from "./MenuElement";

export function HeaderElement() {
    const authentication = useAuthentication()!;
    const owner = getOwner();

    function openMenu() {
        DialogManager.openSideMenu(MenuElement, owner);
    }

    return (
        <div class="header-element">
            {   
                authentication.isLoggedIn()
                    ? <button onClick={openMenu}><i class="bi bi-list"/></button>
                    : null
            }
            <QuiptLogo/>
        </div>
    );
}


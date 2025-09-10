import { createRoot, onMount } from "solid-js";
import { insert } from "solid-js/web";

const pwdChars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!\"#$%&'()*+,-./:;<=>?@[]^_`{|}~";

function InstallDialog() {
    function installApp() {
        if (window.deferredEvent) {
            window.deferredEvent.prompt();
        }
    }
    let dialog: HTMLDialogElement = undefined!;
    
    onMount(() => {
        window.installDialogOpened = true;
        dialog.showModal();
    })
    
    return (
        <dialog id="dialog-box" ref={dialog}>
            <h1 style="margin: 0">Quipt Installieren</h1>
            <span class="decription secondary-text">
            Hallo, Bitte Quipt installieren, weil nur sonst sieht aus
            wie echte App. Andernfalls langweilig, sieht nur aus wie website.
            Aber echte App: cool! Deshalb installieren bitte
            </span>
            <button class="primary-button" onClick={installApp}>App installieren</button>
        </dialog>
    );
}

export function renderBIP() {
    if (window.installDialogOpened) {
        return;
    }
    const root = (<div id="dialog-root"/>) as HTMLDivElement;
    document.body.appendChild(root);

    createRoot(_dispose => {
        insert(root, InstallDialog);
    });
}

export function isLoggedIn() {
    return Boolean(localStorage.getItem('credentials'));
}

export async function createUser() {
    const uuid = window.crypto.randomUUID();

    const seed = new Uint8Array(24);
    window.crypto.getRandomValues(seed);
    const password = Array.from(seed)
        .map(idx => pwdChars.charAt(idx % pwdChars.length)).join('');

    await fetch('/api/user/create', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uuid, password })
    });

    const cred = { uuid, password };
    localStorage.setItem('credentials', JSON.stringify(cred));    
}

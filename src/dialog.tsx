import { Component, JSX, Owner, createRoot, onCleanup, onMount } from "solid-js";
import { insert } from "solid-js/web";


export class DialogManager {
    public static async openDialog<T>(content: Component<{ closer: (x: T|undefined) => void }>, detachedOwner?: typeof Owner): Promise<T|undefined> {
        const rootElement = <div id="dialog-root"/> as HTMLDivElement;
        document.body.appendChild(rootElement);

        const result = await createRoot(
            async dispose => {
                const result = await new Promise<T|undefined>(resolve => {
                    const dialogBox = <DialogBox<T> onClose={resolve}>{ content }</DialogBox>;
                    insert(rootElement, () => dialogBox, null);
                });
                dispose();
                return result;
            },
            detachedOwner
        );

        rootElement.remove();
        return result;
    }

    public static async openSideMenu(content: Component<{ closer: () => void }>, detachedOwner?: typeof Owner): Promise<void> {
        const rootElement = <div id="dialog-root"/> as HTMLDivElement;
        document.body.appendChild(rootElement);

        await createRoot(
            async dispose => {
                await new Promise<void>(resolve => {
                    const dialogBox = <SideMenu onClose={resolve}>{ content }</SideMenu>;
                    insert(rootElement, () => dialogBox, null);
                });
                dispose();
            }, 
            detachedOwner
        );

        rootElement.remove();
    }
}

function SideMenu(
    { children: Children, onClose }: {
        children: Component<{ closer: () => void }>,
        onClose: () => void
    }
): JSX.Element {
    function deferClose() {
        dialog.classList.add('removing');
        dialog.addEventListener('animationend', () => {
            onClose();
        }, { once: true });
    }

    const dialog = (
        <div id="floating-menu">
            <Children closer={deferClose}/>
        </div>
    ) as HTMLDivElement;

    return (
        <>
            <div id="floating-menu-backdrop" onClick={deferClose}/>
            {dialog}
        </>
    );
}

function DialogBox<T>(
    { children: Children, onClose }: {
        children: Component<{ closer: (res: T|PromiseLike<T>|undefined) => void }>,
        onClose: (res: T|PromiseLike<T>|undefined) => void
    }
): JSX.Element {
    let dialog: HTMLDivElement = undefined!;

    function onKeydown(event: KeyboardEvent) {
        if (event.key === "Escape")
            onClose(undefined);
    }

    onMount(() => {
        document.documentElement.addEventListener('keydown', onKeydown);
    })

    onCleanup(() => {
        document.documentElement.removeEventListener('keydown', onKeydown);
    })

    return (
        <>
            <div id="modal-dialog-backdrop" onClick={() => onClose(undefined)}/>
            <div ref={dialog} id="dialog-box">
                <Children closer={onClose}/>
            </div>
        </>
    );
}


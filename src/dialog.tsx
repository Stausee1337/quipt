import { Component, JSX, Owner, createRoot, onMount } from "solid-js";
import { insert } from "solid-js/web";

type DialogButton = {
    title: string,
    dialogResult: string
};

type DialogDescriptor = {
    heading: string,
    description?: string|undefined,
    content?: Component,
    dialogButtons: Array<DialogButton>
};

export class DialogManager {
    public static async openDialog(dialog: DialogDescriptor): Promise<string> {
        const rootElement = <div id="dialog-root"/> as HTMLDivElement;
        document.body.appendChild(rootElement);

        const result = await createRoot(async dispose => {
            const result = await new Promise<string>(resolve => {
                const dialogBox = <DialogBox {...dialog} onClose={resolve}/>;
                insert(rootElement, () => dialogBox, null);
            });
            dispose();
            return result;
        });

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

function DialogBox(descriptor: DialogDescriptor & { onClose: (reason: string) => void }) {
    function deferClose(dialogResult: string) {
        dialog.classList.add('removing');
        dialog.addEventListener('animationend', () => {
            dialog.close(dialogResult);
        }, { once: true });
    }
    const chf = (dr: string) => () => { // click handler factory
        deferClose(dr);
    };
    function clickHandler(event: MouseEvent) {
        const rect = dialog.getBoundingClientRect();
        if (event.clientX >= rect.left && event.clientX <= rect.right &&
            event.clientY >= rect.top && event.clientY <= rect.bottom) {
            return;
        }
        deferClose("cancel");
    }
    const dialog = (
        <dialog id="dialog-box" onClose={() => descriptor.onClose(dialog.returnValue)} onClick={clickHandler}>
            <h3 class="heading">{descriptor.heading}</h3> 
            { descriptor.description != undefined ? 
                <span class="description secondary-text">{descriptor.description}</span> : null }
            { descriptor.content != undefined ? <descriptor.content/>: null }
            <div class="button-line">
                { descriptor.dialogButtons.map(desc => 
                    <button class="result-button" onClick={chf(desc.dialogResult)}>
                        { desc.title }
                    </button>
                ) }
            </div>
        </dialog>
    ) as HTMLDialogElement;

    onMount(() => {
        dialog.showModal();
    });
    return dialog;
}


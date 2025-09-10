import { Component, JSX, ParentProps, createContext, createRoot, createSignal, onCleanup, onMount, useContext } from "solid-js";
import { Portal, insert } from "solid-js/web";
import Hammer from 'hammerjs';
import { RippleEffect } from "./std-widgets";

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
        const rootElement: HTMLDivElement = <div id="dialog-root"/>
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

    public static async openBottomSheet(content: Component<{ closer: () => void }>): Promise<void> {
        const rootElement: HTMLDivElement = <div id="dialog-root"/>
        document.body.appendChild(rootElement);

        await createRoot(async dispose => {
            await new Promise<void>(resolve => {
                const dialogBox = <BottomSheet onClose={resolve}>{ content }</BottomSheet>;
                insert(rootElement, () => dialogBox, null);
            });
            dispose();
        });

        rootElement.remove();
    }
}

function BottomSheet(props: { onClose: () => void, children: Component<{ closer: () => void }> }) {
    let top: number;
    let dialogHeight: number;

    function clickHandler(event: MouseEvent) {
        const rect = dialog.getBoundingClientRect();
        if (event.clientY >= rect.top - 5) {
            return;
        }
        deferClose();
    }

    function deferClose() {
        dialog.classList.add('removing');
        dialog.addEventListener('animationend', () => {
            dialog.close();
        }, { once: true });
    }

    const handle: HTMLSpanElement = <span class="sheet-handle"/>;
    const dialog: HTMLDialogElement = (
        <dialog id="bottom-sheet" onClose={props.onClose} onClick={clickHandler}>
            { handle }
            <div class="sheet-content">
                {  <props.children closer={deferClose}/> }
            </div>
        </dialog>
    );

    let initialized = false;
    const observer = new ResizeObserver(() => {
        if (!initialized) {
            initialized = true;
            return;
        }
        const rect = dialog.getBoundingClientRect();
        const animation = dialog.animate([
            { top: `${top}px` },
            { top: `${window.innerHeight - rect.height}px` }
        ], { duration: 250, easing: 'ease-out' });
        animation.addEventListener("finish", () => {
            dialogHeight = rect.height;
            top = window.innerHeight - dialogHeight;
            dialog.style.top = `${top}px`;
        });
    });

    const hammer = new Hammer(handle);
    hammer.get('pan').set({ direction: Hammer.DIRECTION_VERTICAL });

    hammer.on('pan', e => {
        if (e.deltaY < 0) {
            return;
        }
        dialog.style.top = `${top + e.deltaY}px`;
    });

    const DEFAULT_VELOCITY = 1;
    hammer.on('panend', e => {
        if (e.deltaY/dialogHeight <= 0.5 && e.velocityY < 1.5) {
            const animation = dialog.animate([
                { top: `${top + e.deltaY}px` },
                { top: `${top}px` },
            ], { duration: 250, easing: 'ease-out' });
            animation.addEventListener('finish', () => {
                dialog.style.top = `${top}px`;
            })
            return;
        }
        const remainingHeight = dialogHeight - e.deltaY;
        const velocity = DEFAULT_VELOCITY + e.velocityY;
        const animationTime = (remainingHeight / velocity);
        const animation = dialog.animate([
            { top: `${top + e.deltaY}px` },
            { top: `${window.innerHeight}px` },
        ], { duration: animationTime, easing: 'linear' });
        animation.addEventListener('finish', () => {
            dialog.style.top = `${window.innerHeight}px`;
            fadeOut();
        });
    });

    function fadeOut() {
        dialog.classList.add('fading-out');
        dialog.addEventListener('animationend', () => {
            dialog.close();
        }, { once: true })
    }

    onMount(() => {
        dialogHeight = dialog.getBoundingClientRect().height;
        top = window.innerHeight - dialogHeight;
        dialog.style.top = `${top}px`;
        dialog.showModal();
        observer.observe(dialog);
    });

    onCleanup(() => {
        observer.unobserve(dialog);
    })

    return dialog;
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
    const dialog: HTMLDialogElement = (
        <dialog id="dialog-box" onClose={() => descriptor.onClose(dialog.returnValue)} onClick={clickHandler}>
            <h1 class="heading">{descriptor.heading}</h1> 
            { descriptor.description != undefined ? 
                <span class="description secondary-text">{descriptor.description}</span> : null }
            { descriptor.content != undefined ? <descriptor.content/>: null }
            <div class="button-line">
                { descriptor.dialogButtons.map(desc => 
                    <button class="result-button" onClick={chf(desc.dialogResult)}>
                        { desc.title }
                        <RippleEffect color="#a8c8fb"/>
                    </button>
                ) }
            </div>
        </dialog>
    );

    onMount(() => {
        dialog.showModal();
    });
    return dialog;
}


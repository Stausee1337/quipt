import { Component, Owner, createRoot, getOwner, onCleanup, onMount, } from "solid-js";
import { insert } from "solid-js/web";
import Popper, { createPopper } from "@popperjs/core"

export class ContextMenuEvent extends Event  {
    constructor(public reference: HTMLElement, public clientX: number, public clientY: number) {
        super('еееContextMenu');
    } 
}

function handleContextMenu<P extends Record<string, any>>(
    event: ContextMenuEvent,
    placement: Popper.Placement|"mouse",
    Component: Component<P>,
    props: P,
    detatchedOwner?: typeof Owner
) {
    const reference = event.reference;

    const target = event.target as HTMLElement;
    if (target.classList.contains('menu-open'))
        return;
    target.classList.add('menu-open');

    createRoot(dispose => {
        const popoverMenu =
            <div class="popover-menu" onClick={transactionClick}>
                <Component {...props}/>
            </div> as HTMLDivElement;

        function transactionClick(event: MouseEvent) {
            if (event.target instanceof HTMLLIElement)
                dispose();
        }

        function captureClick(event: MouseEvent) {
            const path = event.composedPath();
            if ((!path.includes(reference) || placement === "mouse") && !path.includes(popoverMenu))
                dispose();
        }

        let popper: Popper.Instance|undefined;
        onMount(() => {
            let virtualReference = placement === "mouse" ? {
                getBoundingClientRect(): DOMRect {
                    return {
                        width: 0,
                        height: 0,
                        top: event.clientY,
                        bottom: event.clientY,
                        left: event.clientX,
                        right: event.clientX,
                        x: event.clientX,
                        y: event.clientY,
                    };
                }
            } : undefined;
            popper = createPopper(
                virtualReference ?? reference,
                popoverMenu,
                {
                    placement: placement === "mouse" ? "right-start" : placement
                }
            )
            document.documentElement.addEventListener('click', captureClick);
            target.addEventListener('еееContextMenu', dispose);
        })

        onCleanup(() => {
            if (popper === undefined) return;
            document.documentElement.removeEventListener('click', captureClick);

            target.classList.remove('menu-open');
            target.removeEventListener('еееContextMenu', dispose);
            popper.destroy();
            popoverMenu.remove();
        })

        insert(document.body, popoverMenu);
    }, detatchedOwner);
}

export function installContextMenuHandler<P extends Record<string, any>>(
    target: HTMLElement,
    placement: Popper.Placement | "mouse",
    Component: Component<P>,
    props: P
) {
    const owner = getOwner() ?? undefined;
    target.addEventListener(
        'еееContextMenu',
        event => handleContextMenu(event, placement, Component, props, owner)
    );
}

export function toggleMenu(event: MouseEvent & { currentTarget: HTMLElement }) {
    event.preventDefault();
    const target = event.currentTarget;
    const toggleMenu = new ContextMenuEvent(/* reference */ target, event.clientX, event.clientY);
    target.dispatchEvent(toggleMenu);
}

declare global {
interface HTMLElementEventMap {
    'еееContextMenu': ContextMenuEvent
}
}


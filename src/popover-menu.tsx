import { Component, Owner, createRoot, getOwner, onCleanup, onMount } from 'solid-js';
import { insert } from 'solid-js/web';

import Popper, { createPopper } from '@popperjs/core';

export class ToggleMenuEvent extends Event {
    constructor(public reference: HTMLElement) {
        super('еееPopoverMenu');
    }
}

export class ContextMenuEvent extends Event {
    constructor(
        public reference: HTMLElement,
        public clientX: number,
        public clientY: number,
    ) {
        super('еееPopoverMenu');
    }
}

let globalContextMenu: (() => void) | undefined;

function handleContextMenu<P extends Record<string, any>>(
    event: ToggleMenuEvent | ContextMenuEvent,
    placement: Popper.Placement,
    Component: Component<P>,
    props: P,
    detatchedOwner?: typeof Owner,
) {
    const reference = event.reference;
    const isContextMenu: boolean = event instanceof ContextMenuEvent;

    const target = event.target as HTMLElement;
    if (!isContextMenu) {
        if (target.classList.contains('menu-open')) return;
        target.classList.add('menu-open');
    } else if (globalContextMenu !== undefined) {
        globalContextMenu();
    }

    createRoot(dispose => {
        const popoverMenu = (
            <div class="popover-menu" onClick={transactionClick}>
                <Component {...props} />
            </div>
        ) as HTMLDivElement;

        function transactionClick(event: MouseEvent) {
            if (event.target instanceof HTMLLIElement) dispose();
        }

        function captureClick(event: MouseEvent) {
            const path = event.composedPath();
            if ((!path.includes(reference) || isContextMenu) && !path.includes(popoverMenu))
                dispose();
        }

        let popper: Popper.Instance | undefined;
        onMount(() => {
            let virtualReference = isContextMenu
                ? {
                      getBoundingClientRect(): DOMRect {
                          const event1 = event as ContextMenuEvent;
                          return {
                              width: 0,
                              height: 0,
                              top: event1.clientY,
                              bottom: event1.clientY,
                              left: event1.clientX,
                              right: event1.clientX,
                              x: event1.clientX,
                              y: event1.clientY,
                          } as DOMRect;
                      },
                  }
                : undefined;
            popper = createPopper(virtualReference ?? reference, popoverMenu, {
                placement: isContextMenu ? 'right-start' : placement,
            });
            document.documentElement.addEventListener('click', captureClick);
            if (!isContextMenu) target.addEventListener('еееPopoverMenu', dispose);
            else globalContextMenu = dispose;
        });

        onCleanup(() => {
            if (popper === undefined) return;
            document.documentElement.removeEventListener('click', captureClick);

            if (!isContextMenu) {
                target.classList.remove('menu-open');
                target.removeEventListener('еееPopoverMenu', dispose);
            } else {
                globalContextMenu = undefined;
            }
            popper.destroy();
            popoverMenu.remove();
        });

        insert(document.body, popoverMenu);
    }, detatchedOwner);
}

export function installPopoverMenuHandler<P extends Record<string, any>>(
    target: HTMLElement,
    placement: Popper.Placement,
    Component: Component<P>,
    props: P,
) {
    const owner = getOwner() ?? undefined;
    target.addEventListener('еееPopoverMenu', event =>
        handleContextMenu(event, placement, Component, props, owner),
    );
}

export function toggleMenu(event: MouseEvent & { currentTarget: HTMLElement }) {
    event.preventDefault();
    const target = event.currentTarget;
    const toggleMenu = new ToggleMenuEvent(/* reference */ target);
    target.dispatchEvent(toggleMenu);
}

export function contextMenu(event: MouseEvent) {
    event.preventDefault();
    const target = event.currentTarget;
    if (!(target instanceof HTMLElement)) return;
    const toggleMenu = new ContextMenuEvent(/* reference */ target, event.clientX, event.clientY);
    target.dispatchEvent(toggleMenu);
}

declare global {
    interface HTMLElementEventMap {
        еееPopoverMenu: ToggleMenuEvent | ContextMenuEvent;
    }
}

import {
    JSX,
    children,
    useEffect,
    useMemo,
    useState,
    onCleanup,
    onMount,
} from 'quipt/rexport';
import { Portal } from 'solid-js/web';

import {
    Placement,
    Instance as PopperInstance,
    VirtualElement,
    createPopper,
} from '@popperjs/core';
import { splitProps } from 'quipt/rexport';

type Trigger = 'click' | 'contextmenu';

let globalContextMenu: (() => void) | undefined;

export function Popover(props: {
    trigger: Trigger;
    placement: Placement;
    content?: JSX.Element;
    children: JSX.Element;
}): JSX.Element {
    const getChildren = children(() => props.children);
    const [popoverReference, setPopoverReference] = useState<HTMLElement | VirtualElement>();
    const [placement, setPlacement] = useState(props.placement);

    function handleTrigger(event: MouseEvent) {
        event.preventDefault();
        const isContextMenu: boolean = event.type === 'contextmenu';
        if (isContextMenu) {
            setPlacement('right-start');
            const virtualReference = {
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
                    } as DOMRect;
                },
            };
            if (globalContextMenu !== undefined) globalContextMenu();
            setPopoverReference(virtualReference);
            globalContextMenu = () => setPopoverReference(undefined);
        } else if (popoverReference() === undefined) {
            setPlacement(props.placement);
            setPopoverReference(computedChildren());
        } else {
            setPopoverReference(undefined);
        }
    }

    useEffect(() => {
        const menuOpen = popoverReference() !== undefined;
        const children = computedChildren();
        if (menuOpen) children.classList.add('menu-open');
        else children.classList.remove('menu-open');
    });

    const computedChildren = useMemo(() => {
        let trigger = props.trigger;

        const children = getChildren();
        const computedChildren =
            children instanceof HTMLElement ? children : ((<span>{children}</span>) as HTMLElement);

        // FIXME: I don't know if there's a better way to do this in solid, since components are
        // "precomputed"

        onMount(() => {
            computedChildren.addEventListener(trigger, handleTrigger);
        });

        onCleanup(() => {
            computedChildren.removeEventListener(trigger, handleTrigger);
        });

        return computedChildren;
    });

    return (
        <>
            {popoverReference() && (
                <PopoverContent
                    placement={placement()}
                    reference={popoverReference()!}
                    onClose={() => setPopoverReference(undefined)}>
                    {props.content}
                </PopoverContent>
            )}
            {computedChildren()}
        </>
    );
}

function PopoverContent(props: {
    children: JSX.Element;
    reference: HTMLElement | VirtualElement;
    placement: Placement;
    onClose: () => void;
}): JSX.Element {
    let popoverMenu: HTMLDivElement = undefined!;
    let popper: PopperInstance | undefined;

    function captureClick(event: MouseEvent) {
        const path = event.composedPath();
        if (!path.includes(props.reference as any) && !path.includes(popoverMenu!)) props.onClose();
    }

    function transactionClick(event: MouseEvent) {
        // TODO: potentially provide a context and a custom element instead of this "solution"
        if (event.target instanceof HTMLLIElement) props.onClose();
    }

    onMount(() => {
        if (popoverMenu === undefined) return;
        popoverMenu.className =
            'p-2 rounded-lg border border-accent1 bg-background z-4000 shadow-lg';
        popoverMenu.addEventListener('click', transactionClick);
        popper = createPopper(props.reference, popoverMenu, { placement: props.placement });
        document.documentElement.addEventListener('click', captureClick);
    });

    onCleanup(() => {
        if (popper === undefined || popoverMenu === undefined) return;
        document.documentElement.removeEventListener('click', captureClick);
        popper.destroy();
        popoverMenu.remove();
    });

    return (
        <Portal mount={document.body} ref={popoverMenu}>
            <ul>{props.children}</ul>
        </Portal>
    );
}

export function PopoverMenuItem(props: HTMLAttributes<HTMLLIElement>): JSX.Element {
    const [, rest] = splitProps(props, ['class']);
    return (
        <li
            className={`hover:bg-accent1 cursor-pointer rounded-sm px-2 py-1 ${props.class ?? ''}`}
            {...rest}
        />
    );
}

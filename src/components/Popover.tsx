import {
    JSX,
    useState,
    onCleanup,
    onMount,
    ReactNode,
} from 'quipt/rexport';
import React, { ComponentProps, useRef } from 'react';
import { createPortal } from 'react-dom';

import classnames from 'classnames';
import {
    Placement,
    Instance as PopperInstance,
    VirtualElement,
    createPopper,
} from '@popperjs/core';

type Trigger = 'click' | 'contextmenu';

let globalContextMenu: (() => void) | undefined;

export function Popover({
    trigger, placement: origPlacement, content, children
}: {
    trigger: Trigger;
    placement: Placement;
    content?: ReactNode;
    children: ReactNode;
}): JSX.Element {
    const targetRef = useRef<HTMLElement>(null);
    const [popoverRef, setPopoverRef] = useState<HTMLElement | VirtualElement>();
    const [placement, setPlacement] = useState(origPlacement);

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
            setPopoverRef(virtualReference);
            globalContextMenu = () => setPopoverRef(undefined);
        } else if (popoverRef === undefined) {
            setPlacement(placement);
            setPopoverRef(targetRef.current!);
        } else {
            setPopoverRef(undefined);
        }
    }

    const newChildren1 = React.isValidElement(children)
        ? children
        : <span>{children}</span>;

    const newChildren2 = {
        ...newChildren1,
        props: {
            ...newChildren1.props,
            onContextMenu: trigger === 'contextmenu' ? handleTrigger : undefined,
            onClick: trigger === 'click' ? handleTrigger : undefined,
            className: classnames(
                popoverRef !== undefined && 'menu-open'
            ),
            ref: targetRef
        }
    };


    return (
        <>
            {popoverRef && (
                <PopoverContent
                    placement={placement}
                    reference={popoverRef}
                    onClose={() => setPopoverRef(undefined)}>
                    {content}
                </PopoverContent>
            )}
            {newChildren2}
        </>
    );
}

function PopoverContent(props: {
    children: ReactNode;
    reference: HTMLElement | VirtualElement;
    placement: Placement;
    onClose: () => void;
}): JSX.Element {
    const popoverMenu = useRef<HTMLDivElement>(null);
    const popper = useRef<PopperInstance>(null);

    function captureClick(event: MouseEvent) {
        const path = event.composedPath();
        if (!path.includes(props.reference as any) && !path.includes(popoverMenu.current!)) props.onClose();
    }

    function transactionClick(event: React.MouseEvent<HTMLDivElement>) {
        event.preventDefault();
        // TODO: potentially provide a context and a custom element instead of this "solution"
        if (event.target instanceof HTMLLIElement) props.onClose();
    }

    onMount(() => {
        if (popoverMenu.current === null) return;
        popper.current = createPopper(props.reference, popoverMenu.current, { placement: props.placement });
        document.documentElement.addEventListener('click', captureClick);
    });

    onCleanup(() => {
        if (popper.current === null) return;
        document.documentElement.removeEventListener('click', captureClick);
        popper.current.destroy();
    });

    return createPortal(
        <div className="p-2 rounded-lg border border-accent1 bg-background z-4000 shadow-lg"
            onClick={transactionClick}
            ref={popoverMenu}>
            <ul>{props.children}</ul>
        </div>,
        document.body
    );
}

export function PopoverMenuItem({ className, ...rest }: ComponentProps<'li'>): JSX.Element {
    return (
        <li
            className={classnames(
                'hover:bg-accent1 cursor-pointer rounded-sm px-2 py-1',
                className
            )}
            {...rest}
        />
    );
}

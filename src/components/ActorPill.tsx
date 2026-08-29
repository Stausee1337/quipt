/* @refresh reload */
import { JSX, children, createMemo, splitProps } from 'solid-js';

import { getActorColor } from 'quipt/components/common';

export interface PillProps extends JSX.HTMLAttributes<HTMLSpanElement> {
    extra?: string;
    actorForColor?: string;
    children?: JSX.Element;
}

export function ActorPill(props: PillProps): JSX.Element {
    const [, rest] = splitProps(props, ['children', 'extra', 'actorForColor', 'style', 'class']);

    const getChildren = children(() => props.children);
    const actorColor = createMemo(() => {
        const children = getChildren();
        const actorForColor =
            props.actorForColor ?? (typeof children === 'string' ? children : undefined);
        if (actorForColor === undefined || actorForColor.length === 0) return '#e3e3e3';
        return getActorColor(actorForColor);
    });

    const isSimpleContent = createMemo(() => typeof getChildren() === 'string');

    return (
        <span
            class={`shrink-0 grow-0 basis-auto rounded-full bg-[var(--actor-color)]/10 px-4 py-2 text-sm font-medium text-[var(--actor-color)] ${props.class ?? ''}`}
            style={{ '--actor-color': actorColor() }}
            {...rest}>
            {props.children}
            {isSimpleContent() && props.extra}
        </span>
    );
}

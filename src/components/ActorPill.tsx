/* @refresh reload */
import { JSX, children, createMemo, splitProps } from "solid-js";
import { getActorColor } from "./common";

export interface PillProps extends Omit<JSX.HTMLAttributes<HTMLSpanElement>, "class"> {
    extra?: string,
    static?: boolean,
    actorForColor?: string,
    children?: JSX.Element
}

export function ActorPill(props: PillProps): JSX.Element {
    const [, rest] = splitProps(props, [
        "children", "extra", "static", "actorForColor", "classList", "style"
    ]);


    const getChildren = children(() => props.children);
    const actorColor = createMemo(() => {
        const children = getChildren();
        const actorForColor = props.actorForColor ?? (typeof children === "string" ? children : undefined);
        if (actorForColor === undefined || actorForColor.length === 0)
            return '#e3e3e3'
        return getActorColor(actorForColor);
    });

    const isSimpleContent = createMemo(() => typeof getChildren() === "string")

    return (
        <span class="actor-pill"
            classList={{ ...props.classList, static: props.static }}
            style={{'--actor-color': actorColor()}}
            {...rest}>
            { props.children }{ isSimpleContent() && props.extra }
        </span>
    )
}


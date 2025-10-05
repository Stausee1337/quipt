/* @refresh reload */
import { JSX, createMemo, splitProps } from "solid-js";
import { getActorColor } from "./common";

export interface PillProps extends Omit<JSX.HTMLAttributes<HTMLSpanElement>, "class"> {
    actor: string,
    count?: number,
    static?: boolean,
    actorForColor?: string,
}

export function ActorPill(props: PillProps): JSX.Element {
    const [, rest] = splitProps(props, [
        "actor", "count", "static", "actorForColor", "classList", "style"
    ]);

    const actorForColor = createMemo(() => props.actorForColor ?? props.actor);

    return (
        <span class="actor-pill"
            classList={{ ...props.classList, static: props.static,  }}
            style={{'--actor-color': getActorColor(actorForColor())}}
            {...rest}>
            { props.actor }{ props.count ? ` (${ props.count })` : null }
        </span>
    )
}


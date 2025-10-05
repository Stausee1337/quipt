/* @refresh reload */
import { JSX, splitProps } from "solid-js";
import { getActorColor } from "./common";

export interface PillProps extends Omit<JSX.HTMLAttributes<HTMLSpanElement>, "class"> {
    actor: string,
    count?: number,
    static?: boolean
}

export function ActorPill(props: PillProps): JSX.Element {
    const [, rest] = splitProps(props, [
        "actor", "count", "static"
    ]);

    return (
        <span class="actor-pill"
            classList={{ ...props.classList, static: props.static }}
            style={{'--actor-color': getActorColor(props.actor)}}
            {...rest}>
            { props.actor }{ props.count ? ` (${ props.count })` : null }
        </span>
    )
}


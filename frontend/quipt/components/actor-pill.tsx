import { type JSX, type ComponentProps } from 'react';

import classnames from 'classnames';

import { colorToString, getColorLightness } from 'quipt/color-palette';
import { type Actor } from 'quipt/utils';

export interface PillProps extends Omit<ComponentProps<'span'>, 'children'> {
    actor: Actor;
    interactable?: boolean;
}

export function ActorPill({
    actor,
    className,
    interactable,
    style,
    ...rest
}: PillProps): JSX.Element {
    const textColor =
        getColorLightness(actor.color) === 'light' ? 'text-background' : 'text-foreground';

    const actorColor = colorToString(actor.color);

    return (
        <span
            className={classnames(
                `shrink-0 grow-0 basis-auto rounded-full bg-(--actor-color) px-3 py-1 text-sm font-medium ${textColor} font-semibold select-none data-interactable:cursor-pointer`,
                className,
            )}
            data-interactable={interactable ? '' : undefined}
            style={{
                '--actor-color': `var(--color-${actorColor})`,
                ...style,
            }}
            children={actor.name}
            {...rest}
        />
    );
}

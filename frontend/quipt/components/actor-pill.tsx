import { type JSX, type ComponentProps } from 'react';

import classnames from 'classnames';

import { type Color, colorToString, getColorLightness } from 'quipt/color-palette';

export interface PillProps extends ComponentProps<'span'> {
    actorColor: Color;
}

export function ActorPill({ actorColor, className, style, ...rest }: PillProps): JSX.Element {
    const textColor =
        getColorLightness(actorColor) === 'light' ? 'text-background' : 'text-foreground';

    return (
        <span
            className={classnames(
                `shrink-0 grow-0 basis-auto rounded-full bg-(--actor-color) px-3 py-1 text-sm font-medium ${textColor} font-semibold select-none`,
                className,
            )}
            style={{ '--actor-color': `var(--color-${colorToString(actorColor)})`, ...style }}
            {...rest}
        />
    );
}

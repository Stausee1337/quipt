import React, { type JSX, memo } from 'react';

import { Button } from '@base-ui/react';

import classnames from 'classnames';

import {
    colorToString,
    asLighterColor,
    asDarkerColor,
    getColorLightness,
} from 'quipt/color-palette';
import { type Actor } from 'quipt/utils';

type ElementProps = React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
export interface PillProps extends Omit<ElementProps, 'children'> {
    actor: Actor;
    interactable?: boolean;
    selected?: boolean;
}

export const ActorPill = memo(
    ({ actor, className, interactable, selected, style, ...rest }: PillProps): JSX.Element => {
        const textColor =
            getColorLightness(actor.color) === 'light' ? 'text-background' : 'text-foreground';

        const defaultColor = colorToString(actor.color);
        const hoverColor = asLighterColor(actor.color);
        const activeColor = asDarkerColor(actor.color);

        const Component = interactable ? Button : 'div';

        return (
            <Component
                className={classnames(
                    'shrink-0 grow-0 basis-auto rounded-full bg-(--default-color) px-3 py-1 text-sm font-medium font-semibold outline-offset-2 outline-(--default-color) select-none data-interactable:cursor-pointer data-interactable:hover:bg-(--hover-color) data-interactable:active:bg-(--active-color) data-selected:outline',
                    textColor,
                    className,
                )}
                data-interactable={interactable ? '' : undefined}
                data-selected={selected ? '' : undefined}
                style={{
                    '--default-color': `var(--color-${defaultColor})`,
                    '--hover-color': `var(--color-${hoverColor})`,
                    '--active-color': `var(--color-${activeColor})`,
                    ...style,
                }}
                children={actor.name}
                aria-label={actor.name}
                {...rest}
            />
        );
    },
);

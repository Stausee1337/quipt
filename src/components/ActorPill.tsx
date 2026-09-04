import { JSX, ComponentProps, useMemo } from 'quipt/rexport';

import classnames from 'classnames';

import { getActorColor } from 'quipt/components/common';

export interface PillProps extends ComponentProps<'span'> {
    extra?: string;
    actorForColor?: string;
}

export function ActorPill({
    children, extra, actorForColor, style, className, ...rest
}: PillProps): JSX.Element {

    const actorColor = useMemo(() => {
        const actorForColor2 =
            actorForColor ?? (typeof children === 'string' ? children : undefined);
        if (actorForColor2 === undefined || actorForColor2.length === 0) return '#e3e3e3';
        return getActorColor(actorForColor2);
    }, [children]);

    const isSimpleContent = useMemo(() => typeof children === 'string', [children]);

    return (
        <span
            className={classnames(
                'shrink-0 grow-0 basis-auto rounded-full bg-[var(--actor-color)]/10 px-4 py-2 text-sm font-medium text-[var(--actor-color)]',
                className
            )}
            style={{ '--actor-color': actorColor }}
            {...rest}>
            {children}
            {isSimpleContent && extra}
        </span>
    );
}

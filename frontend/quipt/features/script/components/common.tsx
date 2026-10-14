import { type ComponentProps, type JSX, memo } from 'react';

import { Button as BaseButton, Separator, type SeparatorProps } from '@base-ui/react';
import classnames from 'classnames';

import { Icon } from 'quipt/components/icon';
import { pluralize } from 'quipt/utils';
import { ActorsContainer } from './actors-container';
import { type ActorKey } from '../state';

export function HLine({ className, ...props }: Omit<SeparatorProps, 'orientation'>): JSX.Element {
    return (
        <Separator
            orientation="horizontal"
            className={classnames('border-accent-30 border-b-1', className)}
            {...props}
        />
    );
}

export function VLine({ className, ...props }: Omit<SeparatorProps, 'orientation'>): JSX.Element {
    return (
        <Separator
            orientation="vertical"
            className={classnames('border-accent-30 border-r-1', className)}
            {...props}
        />
    );
}

export function PlayButton({
    className,
    ...props
}: Omit<ComponentProps<typeof BaseButton>, 'children'>): JSX.Element {
    return (
        <BaseButton
            className={classnames(
                'bg-primary hover:bg-light-primary active:bg-dark-primary cursor-pointer rounded-full p-2 transition-[color,scale] duration-250 hover:scale-[1.1] active:scale-[0.98]',
                className,
            )}
            {...props}>
            <Icon iconName="play-fill" className="icon-lg text-background" />
        </BaseButton>
    );
}

export function MyselfMarker(): JSX.Element {
    return (
        <span className="text-info text-accent-100 border-accent-100 rounded-full border px-2 py-0.5">
            ich selbst
        </span>
    );
}

export const ContentInfoView = memo(
function ContentInfoView({
    actors,
    dialogueCount,
}: {
    actors: readonly ActorKey[];
    dialogueCount: number;
}): JSX.Element {
    return (
        <>
            <ActorsContainer actors={actors} />
            <p className="text-info text-accent-100 flex items-center">
                <Icon iconName="person-standing" className="me-2" />
                {`${actors.length} Spieler`}
            </p>
            <p className="text-info text-accent-100 flex items-center">
                <Icon iconName="chat-text" className="me-2" />
                {pluralize(dialogueCount, 'Dialog', 'Dialoge')}
            </p>
        </>
    );
}
);

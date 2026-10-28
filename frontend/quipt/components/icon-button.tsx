import { type JSX } from 'react';

import { Button, type ButtonProps } from '@base-ui/react';
import classnames from 'classnames';

import { Icon } from 'quipt/components/icon';

export interface IconButtonProps extends ButtonProps {
    iconName: string;
}

export function IconButton({ iconName, className, ...props }: IconButtonProps): JSX.Element {
    return (
        <Button
            className={classnames(
                'text-accent-100 not-data-disabled:hover:bg-accent-100/20 active:not-data-disabled:bg-accent-100/10 rounded-lg p-1.5 not-data-disabled:cursor-pointer data-disabled:cursor-not-allowed data-disabled:opacity-50',
                className,
            )}
            {...props}>
            <Icon iconName={iconName} className="icon-md" aria-hidden="true" />
        </Button>
    );
}

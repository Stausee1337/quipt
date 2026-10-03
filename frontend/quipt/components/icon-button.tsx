import { type JSX } from 'react';

import { Button, type ButtonProps } from '@base-ui/react';
import classnames from 'classnames';

import { Icon } from 'quipt/components/icon';

export interface IconButtonProps extends ButtonProps {
    iconName: string;
}

export function IconButton({
    iconName,
    className,
    ...props
}: IconButtonProps): JSX.Element {
    return (
        <Button className={classnames(
                'p-1.5 rounded-lg cursor-pointer text-accent-100 hover:bg-accent-100/20 active:bg-accent-100/10',
                className
            )}
            {...props}>
            <Icon iconName={iconName} className="icon-md" aria-hidden="true"/>
        </Button>
    );
}


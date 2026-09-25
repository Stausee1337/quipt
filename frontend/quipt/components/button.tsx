import { type JSX } from 'react';

import classnames from 'classnames';
import { Button as BaseButton, type ButtonProps as BaseButtonProps } from '@base-ui/react';

export type ButtonVariant = 'primary' | 'secondary' | 'danger';

export interface ButtonProps extends BaseButtonProps {
    variant: ButtonVariant;
}

const commonButtonStyles = [
    'data-primary:bg-primary data-primary:text-background hover:data-primary:not-data-disabled:bg-light-primary active:data-primary:not-data-disabled:bg-dark-primary data-disabled:data-primary:bg-dark-primary data-disabled:data-primary:bg-dark-primary data-disabled:data-primary:text-background/50',
    'data-secondary:text-foreground data-secondary:border data-secondary:border-accent-100 hover:data-secondary:not-data-disabled:bg-accent-100/20 active:data-secondary:not-data-disabled:bg-accent-100/10 data-disabled:data-secondary:text-foreground/50 data-disabled:data-secondary:border-accent-100/50',
    'data-danger:text-foreground data-danger:bg-red-500 hover:data-danger:not-data-disabled:bg-red-400 active:data-danger:not-data-disabled:bg-red-600 data-disabled:data-danger:text-foreground/50 data-disabled:data-danger:bg-red-800',
];

export function Button({ variant, className, ...props }: ButtonProps): JSX.Element {
    return (
        <BaseButton
            className={classnames(
                'rounded-full px-4 py-1 not-data-disabled:cursor-pointer data-disabled:cursor-not-allowed',
                ...commonButtonStyles,
                className,
            )}
            data-primary={variant === 'primary' ? '' : undefined}
            data-secondary={variant === 'secondary' ? '' : undefined}
            data-danger={variant === 'danger' ? '' : undefined}
            {...props}
        />
    );
}

export function BigButton({ variant, className, ...props }: ButtonProps): JSX.Element {
    return (
        <BaseButton
            className={classnames(
                'rounded-full px-7 py-4 not-data-disabled:cursor-pointer data-disabled:cursor-not-allowed',
                ...commonButtonStyles,
                className,
            )}
            data-primary={variant === 'primary' ? '' : undefined}
            data-secondary={variant === 'secondary' ? '' : undefined}
            data-danger={variant === 'danger' ? '' : undefined}
            {...props}
        />
    );
}

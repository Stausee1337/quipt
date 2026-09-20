import { JSX } from 'react';

import classnames from 'classnames';
import { Input as BaseInput, InputProps } from '@base-ui/react';

const commonInputStyle = 'rounded-full border outline-none border-accent-100/50 hover:not-focus-within:border-accent-100 focus-within:border-primary placeholder:text-accent-100/50';

export function Input({
    className,
    ...props
}: InputProps): JSX.Element {
    return (
        <BaseInput
            className={classnames('px-4 py-1', commonInputStyle, className)}
            {...props}/>
    );
}

export function BigInput({
    className,
    ...props
}: InputProps): JSX.Element {
    return (
        <BaseInput
            className={classnames('px-7 py-4', commonInputStyle, className)}
            {...props}/>
    );
}

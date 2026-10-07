import { type JSX } from 'react';

import classnames from 'classnames';
import { Input as BaseInput, type InputProps } from '@base-ui/react';
import { Icon } from './icon';

const commonInputStyle =
    'rounded-full border outline-none border-accent-100/50 hover:not-focus-within:border-accent-100 focus-within:border-primary placeholder:text-accent-100/50';

export function Input({ className, ...props }: InputProps): JSX.Element {
    return (
        <BaseInput className={classnames('px-4 py-1', commonInputStyle, className)} {...props} />
    );
}

export function BigInput({ className, ...props }: InputProps): JSX.Element {
    return (
        <BaseInput className={classnames('px-7 py-4', commonInputStyle, className)} {...props} />
    );
}

export function SearchInput({ className, placeholder, ...props }: InputProps): JSX.Element {
    return (
        <div className="relative">
            <Icon iconName="search" className="absolute left-[8px] top-[6px] w-5 h-5 text-accent-100/50"/>
            <BaseInput
                className={classnames('ps-9 pe-4 py-1', commonInputStyle, className)}
                placeholder={placeholder ?? 'Suchen'} {...props}/>
        </div>
    );
}

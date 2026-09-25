import { type JSX, type ComponentProps } from 'react';

import classnames from 'classnames';

function Ball({ className, ...props }: ComponentProps<'span'>) {
    return (
        <span className={classnames('bg-background h-4 w-4 rounded-full', className)} {...props} />
    );
}

export function Loader(): JSX.Element {
    return (
        <div className="flex h-6 items-center gap-x-1">
            <Ball className="animate-loader-ball-fade-in-out-1" />
            <Ball className="animate-loader-ball-fade-in-out-2" />
            <Ball className="animate-loader-ball-fade-in-out-3" />
        </div>
    );
}

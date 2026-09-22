import { JSX, ComponentProps } from 'react';

import classnames from 'classnames';

function Ball({
    className,
    ...props
}: ComponentProps<'span'>) {
    return <span 
        className={classnames(
            'h-4 w-4 bg-background rounded-full',
            className
        )} 
        {...props}/>
}

export function Loader(): JSX.Element {
    return (
        <div className="h-6 flex items-center gap-x-1">
            <Ball className="animate-loader-ball-fade-in-out-1"/>
            <Ball className="animate-loader-ball-fade-in-out-2"/>
            <Ball className="animate-loader-ball-fade-in-out-3"/>
        </div>
    );
}

import { useContext, createContext, useRef, JSX, HTMLAttributes } from 'quipt/rexport';

import classnames from 'classnames';

export type ButtonVariant = 'primary' | 'secondary' | 'danger';

export function Button(
    { variant, className, ...rest }: HTMLAttributes<HTMLButtonElement> & {
        variant: ButtonVariant;
    },
): JSX.Element {
    return (
        <button
            className={classnames(
                'border-lighter1 h-8 cursor-pointer rounded-full border px-4 font-medium',
                variant === 'primary' && 'bg-primary active:bg-[#03b66a] disabled:cursor-not-allowed disabled:bg-[#03844c] disabled:text-[#73b398]',
                variant === 'secondary' && 'bg-inherit hover:bg-lighter1 active:bg-accent1',
                variant === 'danger' && 'bg-qpt-red active:bg-[#f1695e]',
                className
            )}
            {...rest}
        />
    );
}

export function IconButton(
    { icon, className, ...rest }: HTMLAttributes<HTMLButtonElement> & {
        icon: string;
    },
) {
    return (
        <button className={classnames(
            'h-10 w-10 cursor-pointer text-2xl',
            className
        )} 
            {...rest}>
            <i className={`bi bi-${icon}`} />
        </button>
    );
}

export function InfoText({ className, ...rest }: HTMLAttributes<HTMLSpanElement>) {
    return (
        <span 
            className={classnames(
                'text-lighter2 text-sm font-light', className
            )}
            {...rest} />
    );
}

const ScrollContextObj = createContext<HTMLDivElement|undefined>(undefined);

export function useScrollContainer(): HTMLDivElement | undefined {
    return useContext(ScrollContextObj);
}

export function ScrollContainer({ children, className, ...rest }: HTMLAttributes<HTMLDivElement>): JSX.Element {
    const containerRef = useRef<HTMLDivElement>(null);

    return (
        <div
            ref={containerRef}
            className={classnames(
                '__ScrollContainer @container z-0 min-h-0 w-full flex-1 overflow-y-auto',
                className
            )}
            {...rest}>
            <ScrollContextObj.Provider value={containerRef.current ?? undefined}>
                {children}
            </ScrollContextObj.Provider>
        </div>
    );
}

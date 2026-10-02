import type { ComponentType } from 'react';

type Without<T, K extends keyof any> = Omit<T, K>;

export function withProps<P extends object, Injected extends Partial<P>>(
    Component: ComponentType<P>,
    injectedProps: Injected,
): ComponentType<Without<P, keyof Injected>> {
    return props => <Component {...(props as P)} {...injectedProps} />;
}

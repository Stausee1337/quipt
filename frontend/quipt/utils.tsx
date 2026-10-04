import type { ComponentType } from 'react';

type Without<T, K extends keyof any> = Omit<T, K>;

export function withProps<P extends object, Injected extends Partial<P>>(
    Component: ComponentType<P>,
    injectedProps: Injected,
): ComponentType<Without<P, keyof Injected>> {
    return props => <Component {...(props as P)} {...injectedProps} />;
}

export function randomID(length = 8): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let id = '';

    for (let i = 0; i < length; i++) {
        id += chars[Math.floor(Math.random() * chars.length)];
    }

    return id;
}

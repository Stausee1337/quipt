import { type ComponentType, useEffect, useRef } from 'react';

import { FontStyles, FormattedString, type FormattedStringElement } from 'quipt/formatted-string';
import { type Color } from 'quipt/color-palette';

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

export type Actor = {
    name: string;
    color: Color;
};

export function formatActorsArray(actors: readonly Actor[]): FormattedString {
    if (actors.length === 0) return new FormattedString([]);

    const result: FormattedStringElement[] = actors.map(actor => ({
        foreground: actor.color,
        fontStyles: FontStyles.None,
        content: actor.name,
    }));

    if (result.length === 1) {
        return new FormattedString(result);
    }

    for (let i = 0; i < Math.floor(result.length / 2); i++) {
        const index = i * 2 + 1;
        result.splice(index, 0, {
            fontStyles: FontStyles.None,
            content: index === result.length - 1 ? ' und ' : ', ',
        });
    }

    return new FormattedString(result);
}

export function pluralize(count: number, singular: string, plural: string): string {
    if (count === 1) return `1 ${singular}`;
    return `${count} ${plural}`;
}

export function useNativeElementListener<K extends keyof HTMLElementEventMap>(
    element: HTMLElement | null,
    type: K,
    listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => any,
) {
    const listenerRef = useRef<(this: HTMLElement, ev: HTMLElementEventMap[K]) => any>(null);
    listenerRef.current = listener;

    useEffect(() => {
        if (element === null) return;
        const currentElement = element;
        function handleEvent(this: HTMLElement, ev: HTMLElementEventMap[K]) {
            listenerRef.current?.call(this, ev);
        }
        currentElement.addEventListener(type, handleEvent);
        return () => {
            currentElement.removeEventListener(type, handleEvent);
        };
    }, [element, type]);
}

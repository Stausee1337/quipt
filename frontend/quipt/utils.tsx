import type { ComponentType } from 'react';

import { FormattedString, type FormattedStringElement } from 'quipt/formatted-string';
import { type Color, colorToString } from 'quipt/color-palette';

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
    readonly name: string;
    readonly color: Color;
};

// TODO: move to formatted-string.ts as renderActorsArray
export function formatActorsArray(actors: readonly Actor[]): FormattedString {
    if (actors.length === 0) return new FormattedString();

    const result: FormattedStringElement[] = actors.map(actor => ({
        style: { color: `var(--color-${colorToString(actor.color)})` },
        string: actor.name,
    }));

    if (result.length === 1) {
        return new FormattedString(result);
    }

    for (let i = 0; i < Math.floor(result.length / 2); i++) {
        const index = i * 2 + 1;
        result.splice(index, 0, {
            style: null,
            string: index === result.length - 1 ? ' und ' : ', ',
        });
    }

    return new FormattedString(result);
}

export function pluralize(count: number, singular: string, plural: string): string {
    if (count === 1) return `1 ${singular}`;
    return `${count} ${plural}`;
}

import { Fragment, type JSX } from 'react';

import type { Properties } from 'csstype';

import {
    type FormattedString,
    type FormattedStringElement,
    FontStyles,
} from 'quipt/formatted-string';
import { colorToString } from 'quipt/color-palette';

function styleToProperties(element: FormattedStringElement): Properties {
    const result: Properties = {};
    if (element.fontStyles & FontStyles.Bold) result.fontWeight = 'bold';
    if (element.fontStyles & FontStyles.Italic) result.fontStyle = 'italic';
    if (element.fontStyles & FontStyles.Underline) result.textDecoration = 'underline';
    if (element.foreground !== undefined)
        result.color = `var(--color-${colorToString(element.foreground)})`;
    return result;
}

function hasStyle(element: FormattedStringElement): boolean {
    return element.fontStyles !== FontStyles.None || element.foreground !== undefined;
}

export function FormattedStringView({ string }: { string: FormattedString }): JSX.Element {
    return (
        <>
            {Array.from(
                string.map(element =>
                    element.content.trim().length > 0 ? (
                        hasStyle(element) ? (
                            <span style={styleToProperties(element)} key={element.content}>
                                {element.content}
                            </span>
                        ) : (
                            <Fragment key={element.content}>{element.content}</Fragment>
                        )
                    ) : (
                        element.content
                    ),
                ),
            )}
        </>
    );
}

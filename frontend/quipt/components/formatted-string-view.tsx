import React, { type CSSProperties, type JSX } from 'react';

export type FormattedStringElement = {
    style: CSSProperties | null;
    string: string;
};
export type FormattedString = FormattedStringElement[];

export function FormattedStringView({ string }: { string: FormattedString }): JSX.Element {
    return (
        <>
            {string.map(item =>
                item.style ? (
                    <span style={item.style} key={item.string}>
                        {item.string}
                    </span>
                ) : (
                    <React.Fragment key={item.string}>{item.string}</React.Fragment>
                ),
            )}
        </>
    );
}

import { Fragment, type JSX } from 'react';

import { FormattedString } from 'quipt/formatted-string';

export function FormattedStringView({ string }: { string: FormattedString }): JSX.Element {
    return (
        <>
            {string.map(item =>
                item.string.trim().length > 0 ? (
                    item.style ? (
                        <span style={item.style} key={item.string}>
                            {item.string}
                        </span>
                    ) : (
                        <Fragment key={item.string}>{item.string}</Fragment>
                    )
                ) : (
                    item.string
                ),
            )}
        </>
    );
}

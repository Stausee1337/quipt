import { JSX, createMemo, splitProps } from 'solid-js';
import { children } from 'solid-js';

import {
    computeDivisionInfo,
    formatMarkdown,
    formatString,
    pluralize,
} from 'quipt/components/common';
import { Division } from 'quipt/schemas';

export interface DivisionInfoViewProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'class'> {
    division: Division;
    external?: JSX.Element;
    children?: JSX.Element;
}

export function DivisionInfoView(props: DivisionInfoViewProps): JSX.Element {
    const [, rest] = splitProps(props, ['children', 'style', 'division', 'external']);

    const getChildren = children(() => props.children);
    const info = createMemo(() => computeDivisionInfo(props.division));

    return (
        <div class="division-info-wrapper">
            <div class="division-info" {...rest}>
                <span class="info">
                    {info().actors.join(', ')} · {pluralize(info().textCues, 'Einsatz', 'Einsätze')}
                </span>
                {props.external ?? (
                    <span class="content">
                        {formatString(formatMarkdown(props.division.description))}
                    </span>
                )}
            </div>
            {getChildren()}
        </div>
    );
}

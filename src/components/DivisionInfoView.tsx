import { JSX, splitProps } from 'solid-js';
import { children } from 'solid-js';

import {
    DivisionInfo,
    FormattedStringView,
    computeDivisionInfo,
    formatMarkdown,
    pluralize,
} from 'quipt/components/common';
import { Division } from 'quipt/schemas';

export interface DivisionInfoViewProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'class'> {
    info: DivisionInfo;
    external?: JSX.Element;
    children?: JSX.Element;
}

export function DivisionInfoView(props: DivisionInfoViewProps): JSX.Element {
    const [, rest] = splitProps(props, ['children', 'style', 'info', 'external']);

    const getChildren = children(() => props.children);

    return (
        <div class="division-info-wrapper">
            <div class="division-info" {...rest}>
                <span class="info">
                    {props.info.actors.join(', ')} ·{' '}
                    {pluralize(props.info.textCues, 'Einsatz', 'Einsätze')}
                </span>
                {props.external ?? (
                    <span class="content">
                        <FormattedStringView string={formatMarkdown(props.info.description)} />
                    </span>
                )}
            </div>
            {getChildren()}
        </div>
    );
}

export interface CreateDivisionInfoViewProps extends Omit<
    JSX.HTMLAttributes<HTMLDivElement>,
    'class'
> {
    division: Division;
    external?: JSX.Element;
    children?: JSX.Element;
}

export function CreateDivisionInfoView(props: CreateDivisionInfoViewProps): JSX.Element {
    const [, rest] = splitProps(props, ['children', 'style', 'division', 'external']);
    return <DivisionInfoView info={computeDivisionInfo(props.division)} {...rest} />;
}

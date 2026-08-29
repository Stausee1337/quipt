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
import { InfoText } from 'quipt/components/basics';

export interface DivisionInfoViewProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'class'> {
    info: DivisionInfo;
    external?: JSX.Element;
    children?: JSX.Element;
}

export function DivisionInfoView(props: DivisionInfoViewProps): JSX.Element {
    const [, rest] = splitProps(props, ['children', 'style', 'info', 'external']);

    const getChildren = children(() => props.children);

    return (
        <div class="flex flex-col items-center gap-2">
            <div
                class="bg-accent1 flex max-w-17/20 flex-col gap-1 overflow-hidden rounded-lg p-2"
                {...rest}>
                <InfoText class="text-center">
                    {props.info.actors.join(', ')} ·{' '}
                    {pluralize(props.info.textCues, 'Einsatz', 'Einsätze')}
                </InfoText>
                {props.external ?? (
                    <span class="text-justify whitespace-pre-wrap">
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

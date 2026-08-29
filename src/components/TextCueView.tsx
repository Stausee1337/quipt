import { JSX, children, createMemo, splitProps } from 'solid-js';

import {
    FormattedString,
    FormattedStringView,
    formatActorsArray,
    formatMarkdown,
} from 'quipt/components/common';
import { TextCue, TextCuePair } from 'quipt/schemas';

export interface TextCueDataViewProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'class'> {
    text: FormattedString;
    actorsInfo: FormattedString | null;
    type: 'request' | 'response';
    beforeExtra?: JSX.Element;
    afterExtra?: JSX.Element;
    children?: JSX.Element;
}

// FIXME (well, that one stings - a bit):
// This component is really not ideal, and a lot of its weird choices (beforeExtra and afterExtra,
// text and children) really come from the legacy CSS styling, and has nothing to do with what the
// component itself is trying to accomplish.
export function TextCueDataView(props: TextCueDataViewProps) {
    const getChildren = children(() => props.children);
    const [, rest] = splitProps(props, [
        'text',
        'actorsInfo',
        'type',
        'beforeExtra',
        'afterExtra',
        'children',
        'classList',
    ]);

    return (
        <div
            class="relative flex flex-col gap-2"
            classList={{
                'items-start': props.type === 'request',
                'items-end': props.type === 'response',
            }}>
            {props.beforeExtra}
            <div
                class="bg-accent1 flex max-w-17/20 flex-col overflow-hidden rounded-lg p-2"
                classList={{
                    'rounded-tl-none': props.type === 'request',
                    'rounded-tr-none': props.type === 'response',
                    ...props.classList,
                }}
                {...rest}>
                {props.actorsInfo !== null ? (
                    <h3 class="text-sm font-medium">
                        <FormattedStringView string={props.actorsInfo} />
                    </h3>
                ) : null}
                {getChildren() ?? (
                    <span class="whitespace-pre-wrap">
                        <FormattedStringView string={props.text} />
                    </span>
                )}
            </div>
            {props.afterExtra}
        </div>
    );
}

export interface TextCueViewProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'class'> {
    textCue: Partial<TextCue> | undefined;
    type: 'request' | 'response';
    beforeExtra?: JSX.Element;
    afterExtra?: JSX.Element;
}

export function TextCueView(props: TextCueViewProps): JSX.Element {
    const [_, rest] = splitProps(props, ['textCue']);

    const cueData = createMemo(() =>
        props.type === 'request'
            ? {
                  actors: formatActorsArray(props.textCue?.actors ?? null),
                  text: props.textCue?.text ?? '_Du bist der erste in diesem Abschnitt_',
              }
            : {
                  actors: formatActorsArray(
                      props.textCue!.actors!.length === 1 ? null : props.textCue!.actors!,
                  ),
                  text: props.textCue!.text!,
              },
    );

    return (
        <TextCueDataView
            text={formatMarkdown(cueData().text)}
            actorsInfo={cueData().actors}
            {...rest}
        />
    );
}

export function TextCuePairView(props: { textCuePair: TextCuePair }): JSX.Element {
    return (
        <>
            <TextCueView textCue={props.textCuePair.request} type="request" />
            <TextCueView textCue={props.textCuePair.response} type="response" />
        </>
    );
}

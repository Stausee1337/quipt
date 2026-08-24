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

export function TextCueDataView(props: TextCueDataViewProps) {
    const getChildren = children(() => props.children);
    const [, rest] = splitProps(props, [
        'text',
        'actorsInfo',
        'type',
        'beforeExtra',
        'afterExtra',
        'children',
    ]);

    return (
        <div class="cue-wrapper">
            {props.beforeExtra}
            <div class={`cue ${props.type}`} {...rest}>
                {props.actorsInfo !== null ? (
                    <h3>
                        <FormattedStringView string={props.actorsInfo} />
                    </h3>
                ) : null}
                {getChildren() ?? (
                    <span class="content">
                        <FormattedStringView string={props.text} />
                    </span>
                )}
            </div>
            {props.afterExtra}
        </div>
    );
}

export interface TextCueViewProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'class'> {
    textCue: TextCue | undefined;
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
                      props.textCue!.actors.length === 1 ? null : props.textCue!.actors,
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

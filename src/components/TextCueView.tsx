import { ComponentProps, JSX, ReactNode, useMemo } from 'quipt/rexport';

import classnames from 'classnames';

import {
    FormattedString,
    FormattedStringView,
    formatActorsArray,
    formatMarkdown,
} from 'quipt/components/common';
import { TextCue, TextCuePair } from 'quipt/schemas';

export interface TextCueDataViewProps extends ComponentProps<'div'> {
    text: FormattedString;
    actorsInfo: FormattedString | null;
    type: 'request' | 'response';
    beforeExtra?: ReactNode;
    afterExtra?: ReactNode;
}

// FIXME (well, that one stings - a bit):
// This component is really not ideal, and a lot of its weird choices (beforeExtra and afterExtra,
// text and children) really come from the legacy CSS styling, and has nothing to do with what the
// component itself is trying to accomplish.
export function TextCueDataView({
    text,
    actorsInfo,
    type,
    beforeExtra,
    afterExtra,
    children,
    className,
    ...rest
}: TextCueDataViewProps) {
    return (
        <div
            className={classnames(
                'relative flex flex-col gap-2',
                type === 'request' && 'items-start',
                type === 'response' && 'items-end',
            )}
            >
            {beforeExtra}
            <div
                className={classnames(
                    'bg-accent1 flex max-w-17/20 flex-col overflow-hidden rounded-lg p-2',
                    type === 'request' && 'rounded-tl-none',
                    type === 'response' && 'rounded-tr-none',
                    className,
                )}
                {...rest}>
                {actorsInfo !== null ? (
                    <h3 className="text-sm font-medium">
                        <FormattedStringView string={actorsInfo} />
                    </h3>
                ) : null}
                {children ?? (
                    <span className="whitespace-pre-wrap">
                        <FormattedStringView string={text} />
                    </span>
                )}
            </div>
            {afterExtra}
        </div>
    );
}

export interface TextCueViewProps extends ComponentProps<'div'> {
    textCue: Partial<TextCue> | undefined;
    type: 'request' | 'response';
    beforeExtra?: ReactNode;
    afterExtra?: ReactNode;
}

export function TextCueView({ textCue, ...rest }: TextCueViewProps): JSX.Element {

    const cueData = useMemo(() =>
        rest.type === 'request'
            ? {
                  actors: formatActorsArray(textCue?.actors ?? null),
                  text: textCue?.text ?? '_Du bist der erste in diesem Abschnitt_',
              }
            : {
                  actors: formatActorsArray(
                      textCue!.actors!.length === 1 ? null : textCue!.actors!,
                  ),
                  text: textCue!.text!,
              },
        [rest, textCue]);

    return (
        <TextCueDataView text={formatMarkdown(cueData.text)} actorsInfo={cueData.actors} {...rest}/>
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

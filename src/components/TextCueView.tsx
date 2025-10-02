import { JSX, createSignal } from "solid-js";
import { formatActorsArray, formatMarkdown, formatString, progressBarGreen, progressBarRed, progressBarYellow } from "./common";
import { FormattedString, TextCue, TextCuePair } from "../backend";

const confidenceIconMap = [
    {
        'low': '\uF31D',
        'medium': '\uF323',
        'high': '\uF327',
    },
    {
        'low': '\uF31C',
        'medium': '\uF322',
        'high': '\uF324',
    },
];

function ConfidenceReportButton(
    props: {
        confidence: "low"|"medium"|"high",
        reporter?: (source: EventTarget & Element, confidence: "low"|"medium"|"high") => void
    }
): JSX.Element {
    const [clicked, setClicked] = createSignal<boolean>(false);

    function onClick(event: MouseEvent & { currentTarget: HTMLSpanElement }) {
        const reporter = props.reporter;
        if (reporter === undefined) return;
        setClicked(true);
        reporter(event.currentTarget, props.confidence);
    }

    const confidenceIconColor = {
        'low': progressBarRed,
        'medium': progressBarYellow,
        'high': progressBarGreen,
    };

    return (
        <span class="smiley"
            onClick={onClick}
            style={{ color: confidenceIconColor[props.confidence] }}>
            { confidenceIconMap[Number(clicked())][props.confidence] }
        </span>
    )
}


export enum TextCueViewFlags {
    Editable = 1,
    Ratable = 2,
}

export type TextCueViewProps = {
    last: boolean,
    text: FormattedString,
    actorsInfo: FormattedString|null,
    type: "request"|"response",
    flags?: TextCueViewFlags,
    confidenceReport?: (source: EventTarget & Element, confidence: "low"|"medium"|"high") => void
};

export function TextCueView(props: TextCueViewProps) {
    const isRatable = () => (props.flags ?? 0) & TextCueViewFlags.Ratable;

    return (
        <div class="cue-wrapper">
            <div class={`cue ${props.type}`} 
                classList={{'last': props.last}}>
                { props.actorsInfo !== null ? <h3>{ formatString(props.actorsInfo) }</h3> : null }
                <span class="content">
                    { formatString(props.text) }
                </span>
            </div>
            {
                (props.type === "response" && isRatable()) ? (
                    <div class="confidence-rating">
                        <ConfidenceReportButton confidence="low" reporter={props.confidenceReport}/>
                        <ConfidenceReportButton confidence="medium" reporter={props.confidenceReport}/>
                        <ConfidenceReportButton confidence="high" reporter={props.confidenceReport}/>
                    </div>
                ) : null
            }
        </div>
    );
}

export function renderCue(
    textCue: Readonly<TextCue> | null,
    type: "request"|"response",
    extraProps?: Partial<TextCueViewProps>
): JSX.Element {
    const cueData = type === "request" 
        ? { actors: formatActorsArray(textCue?.actors ?? null), text: textCue?.text ?? "Du bist der erste in diesem Abschnitt" }
        : { actors: formatActorsArray(textCue!.actors.length === 1 ? null : textCue!.actors), text: textCue!.text! };
    return (
        <TextCueView
            last={false}
            type={type}
            text={formatMarkdown(cueData.text)}
            actorsInfo={cueData.actors}
            {...extraProps}/>
    );
}

export function renderCuePair(textCuePair: Readonly<TextCuePair>): JSX.Element {
    return (
        <>
            { renderCue(textCuePair.request, "request") }
            { renderCue(textCuePair.response, "response") }
        </>
    );
}

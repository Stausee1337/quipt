import { JSX, createSignal } from "solid-js";
import { progressBarGreen, progressBarRed, progressBarYellow } from "./common";

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

export type ConfidenceReporter = (source: EventTarget & Element, confidence: "low"|"medium"|"high") => void;

export function ConfidenceReportButton(
    props: {
        confidence: "low"|"medium"|"high",
        reporter?: ConfidenceReporter
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

export function ConfidenceReportView(
    props: {
        confidenceReport?: ConfidenceReporter
    }
): JSX.Element {

    return (
        <div class="confidence-rating">
            <ConfidenceReportButton confidence="low" reporter={props.confidenceReport}/>
            <ConfidenceReportButton confidence="medium" reporter={props.confidenceReport}/>
            <ConfidenceReportButton confidence="high" reporter={props.confidenceReport}/>
        </div>
    );
}

import { JSX, createSignal } from "solid-js";
import { formatString, progressBarGreen, progressBarRed, progressBarYellow } from "./common";
import { FormattedString } from "../backend";

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

type TextCueViewProps = {
    last: boolean,
    text: FormattedString,
    actorsInfo: FormattedString|null,
    type: "request"|"response",
    confidenceReport?: (source: EventTarget & Element, confidence: "low"|"medium"|"high") => void
};

export function TextCueView(props: TextCueViewProps) {
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
                props.type === "response" ? (
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

/* @refresh reload */
import { JSX, createSignal } from "solid-js";
import { formatActorsArray, formatMarkdown, formatString, progressBarGreen, progressBarRed, progressBarYellow } from "./common";
import { FormattedString, TextCue, TextCuePair } from "../backend";
import { ExposedComponent, bindComponent } from "../exposed-component";

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

export type TextCueViewProps = {
    last: boolean,
    text: FormattedString,
    actorsInfo: FormattedString|null,
    type: "request"|"response",
    isRatable?: boolean,
    confidenceReport?: (source: EventTarget & Element, confidence: "low"|"medium"|"high") => void
};

interface TextCueComponent {
    readonly cueElement: HTMLDivElement;
    injectContent(content: JSX.Element): () => void;
}

type ExposedComponentType = ExposedComponent<TextCueComponent>;

export function TextCueView(props: TextCueViewProps): ExposedComponentType {
    let cueElement: HTMLDivElement;
    const [externalContent, setExternalContent] = createSignal<JSX.Element>();

    return bindComponent<TextCueComponent>({
        get cueElement() {
            console.log('get cueElement()');
            return cueElement;
        },
        injectContent(content) {
            setExternalContent(content); 
            return () => setExternalContent(undefined);
        },
        template: (
            <div class="cue-wrapper">
                <div ref={cueElement} class={`cue ${props.type}`} 
                    classList={{'last': props.last}}>
                    { props.actorsInfo !== null ? <h3>{ formatString(props.actorsInfo) }</h3> : null }
                    {
                        externalContent() ?? (
                            <span class="content">
                                { formatString(props.text) }
                            </span>
                        )
                    }
                </div>
                {
                    (props.type === "response" && props.isRatable) ? (
                        <div class="confidence-rating">
                            <ConfidenceReportButton confidence="low" reporter={props.confidenceReport}/>
                            <ConfidenceReportButton confidence="medium" reporter={props.confidenceReport}/>
                            <ConfidenceReportButton confidence="high" reporter={props.confidenceReport}/>
                        </div>
                    ) : null
                }
            </div>
        )
    })
}

export function renderCue(
    textCue: Readonly<TextCue> | null,
    type: "request"|"response",
    extraProps?: Partial<TextCueViewProps>
): ExposedComponentType {
    const cueData = type === "request" 
        ? { actors: formatActorsArray(textCue?.actors ?? null), text: textCue?.text ?? "_Du bist der erste in diesem Abschnitt_" }
        : { actors: formatActorsArray(textCue!.actors.length === 1 ? null : textCue!.actors), text: textCue!.text! };
    return (
        <TextCueView
            last={false}
            type={type}
            text={formatMarkdown(cueData.text)}
            actorsInfo={cueData.actors}
            {...extraProps}/>
    ) as ExposedComponentType;
}

export function renderCuePair(textCuePair: Readonly<TextCuePair>): JSX.Element {
    return (
        <>
            { renderCue(textCuePair.request, "request") }
            { renderCue(textCuePair.response, "response") }
        </>
    )
}

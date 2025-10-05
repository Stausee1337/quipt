/* @refresh reload */
import { Component, JSX, createMemo, createSignal, getOwner, runWithOwner } from "solid-js";
import { formatActorsArray, formatMarkdown, formatString } from "./common";
import { FormattedString, TextCue, TextCuePair } from "../backend";
import { ExposedComponent, bindComponent } from "../exposed-component";
import { untrack } from "solid-js";

export type TextCueViewProps = {
    text: FormattedString,
    actorsInfo: FormattedString|null,
    type: "request"|"response",
};

interface TextCueComponent {
    readonly cueElement: HTMLDivElement;
    injectContent(content: JSX.Element): (() => void)|undefined;
    addExtension(component: Component): void;
    removeExtension(component: Component): void;
}

type ExposedComponentType = ExposedComponent<TextCueComponent>;

export function TextCueView(props: TextCueViewProps): ExposedComponentType {
    let cueElement: HTMLDivElement;
    const [externalContent, setExternalContent] = createSignal<JSX.Element>();
    const [signal, setSignal] = createSignal({});
    const extensions = new Map<Component, JSX.Element>();
    const owner = getOwner()!;

    function instantiateComponent(Component: Component): JSX.Element {
        return runWithOwner(owner, () => createMemo(() => <Component/>)());
    }

    const extensionElements = createMemo(() => {
        signal();
        return Array.from(extensions.values());
    });

    return bindComponent<TextCueComponent>({
        get cueElement() {
            return cueElement;
        },
        injectContent(content) {
            if (untrack(externalContent) !== undefined)
                return;
            setExternalContent(content); 
            return () => setExternalContent(undefined);
        },
        addExtension(component) {
            extensions.set(component, instantiateComponent(component));
            setSignal({});
        },
        removeExtension(component) {
            extensions.delete(component);
            setSignal({}); 
        },
        template: (
            <div class="cue-wrapper">
                <div ref={cueElement} class={`cue ${props.type}`}>
                    { props.actorsInfo !== null ? <h3>{ formatString(props.actorsInfo) }</h3> : null }
                    {
                        externalContent() ?? (
                            <span class="content">
                                { formatString(props.text) }
                            </span>
                        )
                    }
                </div>
                { extensionElements() }
            </div>
        )
    })
}

export function renderCue(
    textCue: Readonly<TextCue> | null,
    type: "request"|"response",
): ExposedComponentType {
    const cueData = type === "request" 
        ? { actors: formatActorsArray(textCue?.actors ?? null), text: textCue?.text ?? "_Du bist der erste in diesem Abschnitt_" }
        : { actors: formatActorsArray(textCue!.actors.length === 1 ? null : textCue!.actors), text: textCue!.text! };
    return (
        <TextCueView
            type={type}
            text={formatMarkdown(cueData.text)}
            actorsInfo={cueData.actors}/>
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

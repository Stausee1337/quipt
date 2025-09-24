import { JSX, useContext } from 'solid-js';
import { EditorView, minimalSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { markdown } from '@codemirror/lang-markdown';
import { Script, TextCue, TextCuePair } from '../backend';
import { formatActorsArray, formatMarkdown } from './common';
import { TextCueView } from './TextCueView';
import { ScriptContextObj } from '../script';
import { DivisionInfoView } from './DivisionInfoView';

const myTheme = EditorView.theme({
  // ".cm-content": {
  //   caretColor: "red",  // caret (cursor) color
  // },
  // "&.cm-focused .cm-cursor": {
  //   borderLeftColor: "red"  // caret visible when focused
  // },
  // "&.cm-focused .cm-selectionBackground, ::selection": {
  //   backgroundColor: "rgba(0, 128, 255, 0.3)"  // selection color
  // }
}, {dark: true}) // set dark: true if this is a dark theme

function Editor(): JSX.Element {
    const view = new EditorView({
        extensions: [
            myTheme,
            minimalSetup,
            markdown(),
            EditorState.transactionFilter.of(tr => {
                return tr.newDoc.lines > 1 ? [] : [tr]
            })
        ],
    });
    return view.dom;
}

function ScriptCueView(
    props: {
        script: Readonly<Script>
    }
): JSX.Element {
    function renderCue(textCue: Readonly<TextCue> | null, type: "request"|"response"): JSX.Element {
        const cueData = type === "request" 
            ? { actors: formatActorsArray(textCue?.actors ?? null), text: textCue?.text ?? "Du bist der erste in diesem Abschnitt" }
            : { actors: formatActorsArray(textCue!.actors), text: textCue!.text! };
        return (
            <TextCueView
                last={false}
                type={type}
                text={formatMarkdown(cueData.text)}
                actorsInfo={cueData.actors}/>);
    }

    function renderCuePair(textCuePair: Readonly<TextCuePair>): JSX.Element {
        return (
            <>
                { renderCue(textCuePair.request, "request") }
                { renderCue(textCuePair.response, "response") }
            </>
        );
    }

    return (
        <div class="desktop-view">
            <h2 class="script-title">{ props.script.name }</h2>
            <div class="grid-layout-filler overview">
                <div class="division-overview">
                </div>
            </div>
            <div class="grid-layout-filler cues">
                {
                    props.script.divisions.map(division => {
                        return (
                            <div class="script-divsion">
                                <h2>{ division.name }</h2>
                                <DivisionInfoView division={division}/>
                                { division.textCues.map(renderCuePair) }
                            </div>
                        );
                    })
                } 
            </div>
        </div>
    );
}

export function ScriptViewer(): JSX.Element {
    const scriptContext = useContext(ScriptContextObj)!;

    return (
        <>
            { scriptContext.instantiateDelayed(ScriptCueView) }
        </>
    );
}

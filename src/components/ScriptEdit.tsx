import { JSX, useContext } from 'solid-js';
import { EditorView, minimalSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { markdown } from '@codemirror/lang-markdown';
import { Script } from '../backend';
import { renderCuePair } from './TextCueView';
import { ScriptContextObj } from '../script';
import { DivisionInfoView } from './DivisionInfoView';
import { useNavigate, useParams } from '@solidjs/router';

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
    return (
        <div class="desktop-view">
            <h2 class="script-title">{ props.script.name }</h2>
            <div class="grid-layout-filler overview">
                <div class="division-overview">
                </div>
            </div>
            <div class="grid-layout-filler cues">
                <div class="readable-content-view">
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
        </div>
    );
}

export function ScriptViewer(): JSX.Element {
    const scriptContext = useContext(ScriptContextObj)!;

    const params = useParams();
    const navigate = useNavigate();
    if (params.uuid === undefined) {
        navigate('/');
        return;
    }

    return (
        <>
            { scriptContext.instantiateDelayed(ScriptCueView) }
        </>
    );
}

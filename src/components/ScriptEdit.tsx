import { JSX, createContext, createSignal, onCleanup, onMount, useContext } from 'solid-js';
import { EditorView, basicSetup, minimalSetup } from 'codemirror';
import { EditorState, Extension } from '@codemirror/state';
import { GutterMarker, gutter, lineNumberMarkers } from '@codemirror/view';
import { markdown } from '@codemirror/lang-markdown';

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

export function DesktopScriptEdit(): JSX.Element {
    return (
        <div class="desktop-edit">
            <h2>This is the scripts title</h2>
            <div class="grid-layout-filler overview">
                <div class="division-overview">
                </div>
            </div>
            <div class="grid-layout-filler cues">
            </div>
        </div>
    );
}

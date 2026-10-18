import { renderBBCode } from 'quipt/formatted-string';
import type { Color } from 'quipt/color-palette';
import type { Action, ScriptEditorManager } from './manager';
import type { ActorKey, EditableScriptNode, Key, TransientState } from './state';
import { createEditorState } from './editor';

export function editItem(itemKey: Key<EditableScriptNode>): Action {
    return (state: TransientState, manager: ScriptEditorManager) => {
        const item = state.lookup(itemKey);
        state.replaceNode(itemKey, {
            content: createEditorState(item.key, item.text, manager),
        });
    };
}

export function editDone(itemKey: Key<EditableScriptNode>): Action {
    return (state: TransientState) => {
        const item = state.lookup(itemKey);
        state.replaceNode(itemKey, { content: renderBBCode(item.text) });
    };
}

export function changeActorColor(actorKey: ActorKey, newColor: Color): Action {
    return (state: TransientState) => {
        state.replaceNode(actorKey, { color: newColor });
    };
}

export function renameActor(actorKey: ActorKey, newName: string): Action {
    return (state: TransientState) => {
        state.replaceNode(actorKey, { name: newName });
    };
}

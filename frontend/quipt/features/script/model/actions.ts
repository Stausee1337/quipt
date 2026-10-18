import { renderBBCode } from 'quipt/formatted-string';
import type { Color } from 'quipt/color-palette';
import type { ScriptEditorManager } from './manager';
import type { ActorKey, EditableScriptNode, Key, TransientState } from './state';
import { createEditorState } from './editor';

// TODO: make actions able to opt out of "making history"

export function editItem(
    itemKey: Key<EditableScriptNode>,
    state: TransientState,
    manager: ScriptEditorManager,
) {
    const item = state.lookup(itemKey);
    state.replaceNode(itemKey, {
        content: createEditorState(item.key, item.text, manager),
    });
}

export function editDone(itemKey: Key<EditableScriptNode>, state: TransientState) {
    const item = state.lookup(itemKey);
    state.replaceNode(itemKey, { content: renderBBCode(item.text) });
}

export function changeActorColor(
    { actorKey, newColor }: { actorKey: ActorKey; newColor: Color },
    state: TransientState,
) {
    state.replaceNode(actorKey, { color: newColor });
}

export function renameActor(
    { actorKey, newName }: { actorKey: ActorKey; newName: string },
    state: TransientState,
) {
    // TODO: we need to associate stuff in the ScrptEditorState itself, in order for the `merge`
    // functions to pull it out again
    state.replaceNode(actorKey, { name: newName });
}

renameActor.merge = () => true;

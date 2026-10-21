import { renderBBCode } from 'quipt/formatted-string';
import type { Color } from 'quipt/color-palette';
import type { ScriptEditorManager } from './manager';
import type { ActorKey, EditableScriptNode, Key, ScriptEditorState, TransientState } from './state';
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

const renameActorKey: unique symbol = Symbol('renameActor');

export type RenameActorProps = {
    actorKey: ActorKey;
    name: string;
    inputId: string;
    event: Event;
};

const relevantInputTypes = new Set(['insertText', 'deleteContentBackward', 'deleteContentForward']);

type RelevantInputType = 'insertText' | 'deleteContentBackward' | 'deleteContentForward';

function isRelevantInputType(inputType: string): inputType is RelevantInputType {
    return relevantInputTypes.has(inputType);
}

type InputEventMeta = {
    inputType: RelevantInputType;
    timestamp: number;
    inputId: string;
    content: string;
};

export function renameActor(
    { actorKey, name, inputId, event }: RenameActorProps,
    state: TransientState,
) {
    if (event instanceof InputEvent && isRelevantInputType(event.inputType)) {
        const meta: InputEventMeta = {
            inputType: event.inputType,
            inputId,
            timestamp: Date.now(),
            content: name,
        };
        state.setMeta(renameActorKey, meta);
    }
    state.replaceNode(actorKey, { name });
}

const timestampMergeThreshold = 750;

renameActor.merge = (prevState: ScriptEditorState, currentState: ScriptEditorState) => {
    const prevMeta: InputEventMeta | undefined = prevState.getMeta(renameActorKey);
    const currentMeta: InputEventMeta | undefined = currentState.getMeta(renameActorKey);
    const merge =
        prevMeta !== undefined &&
        currentMeta !== undefined &&
        prevMeta.inputId === currentMeta.inputId &&
        prevMeta.inputType === currentMeta.inputType &&
        currentMeta.timestamp - prevMeta.timestamp <= timestampMergeThreshold;
    return merge;
};

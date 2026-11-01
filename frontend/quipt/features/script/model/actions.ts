import type { Color } from 'quipt/color-palette';
import { stateAction } from './store';
import {
    type ActorKey,
    type ContentfulScriptNode,
    type Key,
    keyOfType,
    DialogueNode,
    SectionNode,
    TransientState,
    ScriptEditorState,
    Actor,
    ActionNode,
    structureGetChildIndex,
    type EditingNodeState,
} from './state';

export const setEditingNodeState = stateAction<EditingNodeState | null>({
    apply(editingNodeState, state) {
        state.editingNodeState = editingNodeState;
    },
    makeHistory: false,
});

export const changeDialogueActors = stateAction<{
    dialogue: Key<DialogueNode>;
    actors: ActorKey[];
}>({
    apply({ dialogue, actors }, state) {
        state.replaceNode(dialogue, { actors });
        state.recomputeSectionMetaInfo();
    },
});

export const removeContentfulNode = stateAction({
    apply(itemKey: Key<ContentfulScriptNode>, state) {
        state.removeNode(itemKey);
        state.recomputeSectionMetaInfo();
    },
});

export const insertNewItemBefore = stateAction<
    {
        referenceKey: Key<ContentfulScriptNode>;
        kind: 'action' | 'dialogue';
    },
    Key<ContentfulScriptNode>
>({
    apply({ kind, referenceKey }, state) {
        const referenceNode = state.lookup(referenceKey);
        const createdNode =
            kind === 'action'
                ? state.allocate(ActionNode, '')
                : state.allocate(DialogueNode, [], '');

        const parent =
            referenceNode.parent !== null ? state.lookup(referenceNode.parent) : undefined;
        const index =
            parent !== undefined
                ? parent.children.findIndex(child => child.key === referenceKey)
                : structureGetChildIndex(state.structure, referenceKey);
        state.insertNode(createdNode, index, parent);
        state.recomputeSectionMetaInfo();
        return createdNode.key;
    },
});

export const removeSection = stateAction({
    apply(itemKey: Key<SectionNode>, state) {
        state.removeNode(itemKey);
    },
});

function randomColor(): Color {
    return (1 + Math.floor(Math.random() * 24)) as Color;
}

export const createActorOnDialogue = stateAction<Key<DialogueNode>, ActorKey>({
    apply(dialogueKey, state) {
        const newActor = state.allocate(Actor, '', randomColor());
        const dialogue = state.lookup(dialogueKey);
        state.replaceNode(dialogueKey, {
            actors: [...dialogue.actors, newActor.key],
        });
        state.actors = new Map(state.actors);
        state.actors.set(newActor.key, 1);
        state.recomputeSectionMetaInfo();
        return newActor.key;
    },
});

export const changeActorColor = stateAction<{ actorKey: ActorKey; newColor: Color }>({
    apply({ actorKey, newColor }, state) {
        state.replaceNode(actorKey, { color: newColor });
    },
});

const bundleInputEventKey: unique symbol = Symbol('bundleInputEvent');

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

function addBundleInputEventMeta(
    state: TransientState,
    content: string,
    event: Event,
    inputId: string,
) {
    if (event instanceof InputEvent && isRelevantInputType(event.inputType)) {
        const meta: InputEventMeta = {
            inputType: event.inputType,
            inputId,
            timestamp: Date.now(),
            content,
        };
        state.setMeta(bundleInputEventKey, meta);
    }
}

const timestampMergeThreshold = 750;

function shouldBundleInputStates(prevState: ScriptEditorState, currentState: ScriptEditorState) {
    const prevMeta: InputEventMeta | undefined = prevState.getMeta(bundleInputEventKey);
    const currentMeta: InputEventMeta | undefined = currentState.getMeta(bundleInputEventKey);
    const merge =
        prevMeta !== undefined &&
        currentMeta !== undefined &&
        prevMeta.inputId === currentMeta.inputId &&
        prevMeta.inputType === currentMeta.inputType &&
        currentMeta.timestamp - prevMeta.timestamp <= timestampMergeThreshold;
    return merge;
}

export const renameActor = stateAction<RenameActorProps>({
    apply({ actorKey, name, inputId, event }, state) {
        const prevActor = state.actors.keys().find(key => state.lookup(key).name === name);
        if (prevActor !== undefined) {
            state.visitNodes(node => {
                if (keyOfType(node, DialogueNode)) {
                    const dialogue = state.lookup(node);
                    const prevActorIdx = dialogue.actors.indexOf(prevActor);
                    if (prevActorIdx !== -1) {
                        state.replaceNode(node, {
                            actors: dialogue.actors.toSpliced(prevActorIdx, 1, actorKey),
                        });
                    }
                }
            });
            state.actors = new Map(state.actors);
            state.actors.delete(prevActor);
            state.unlinkNode(prevActor);
            state.recomputeSectionMetaInfo();
        }
        addBundleInputEventMeta(state, name, event, inputId);
        state.replaceNode(actorKey, { name });
    },
    merge(prevState, currentState) {
        return shouldBundleInputStates(prevState, currentState);
    },
});

export const editSectionBegin = stateAction<Key<SectionNode>>({
    apply(sectionKey, state) {
        state.replaceNode(sectionKey, { editing: true });
    },
});

export const editSectionEnd = stateAction<Key<SectionNode>>({
    apply(sectionKey, state) {
        state.replaceNode(sectionKey, { editing: false });
    },
});

type RenameSectionProps = {
    sectionKey: Key<SectionNode>;
    name: string;
    inputId: string;
    event: Event;
};

export const renameSection = stateAction<RenameSectionProps>({
    apply({ sectionKey, name, event, inputId }, state) {
        addBundleInputEventMeta(state, name, event, inputId);
        state.replaceNode(sectionKey, { name });
    },
    merge(prevState, currentState) {
        return shouldBundleInputStates(prevState, currentState);
    },
});

export const toggleActorMarkedAsSelf = stateAction<ActorKey>({
    apply(actorKey, state) {
        state.selfActor = state.selfActor === actorKey ? null : actorKey;
    },
});

export const toggleNodeMarkedAsContext = stateAction<Key<ContentfulScriptNode>>({
    apply(nodeKey, state) {
        const node = state.lookup(nodeKey);
        state.replaceNode(nodeKey, { markedAsContext: !node.markedAsContext });
    },
});

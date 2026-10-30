import { Map as ImmutableMap } from 'immutable';

import { EditorState } from 'prosemirror-state';

import { FormattedString, renderBBCode } from 'quipt/formatted-string';
import type { ItemsContent, SectionContent, SupersectionContent } from 'quipt/schemas/script';
import { type Actor as BaseActor, randomID } from 'quipt/utils';
import { type Color, ensureColor } from 'quipt/color-palette';
import type { Script } from '../script';

type SectionKeyPack<TChild> = { key: Key<SectionNode>; children: TChild[] };
type RootPack<TDepth extends number, TChild> = { depth: TDepth; children: TChild[] };

type SupersectionPack = SectionKeyPack<SectionPack>;
type SectionPack = SectionKeyPack<ScriptItemKey>;
type ScriptItemKey = Key<ActionNode> | Key<DialogueNode>;

export type Structure =
    RootPack<0, ScriptItemKey> | RootPack<1, SectionPack> | RootPack<2, SupersectionPack>;

function buildScriptItems(
    content: ItemsContent,
    actorLookup: Record<string, Actor>,
    pool: PoolType,
): [ScriptItemKey[], (ActionNode | DialogueNode)[]] {
    const keys: ScriptItemKey[] = [];
    const nodes: (ActionNode | DialogueNode)[] = [];
    for (const item of content.items) {
        switch (item.kind) {
            case 'action': {
                const node = allocateIn(pool, ActionNode, item.content);
                nodes.push(node);
                keys.push(node.key);
                break;
            }
            case 'dialogue': {
                const node = allocateIn(
                    pool,
                    DialogueNode,
                    item.actors.map(actor => actorLookup[actor].key),
                    item.content,
                );
                nodes.push(node);
                keys.push(node.key);
                break;
            }
        }
    }
    return [keys, nodes];
}

function buildSections(
    content: SectionContent,
    actorLookup: Record<string, Actor>,
    pool: PoolType,
    depth: 0 | 1,
): [SectionPack[], SectionNode[]] {
    const packs: SectionPack[] = [];
    const nodes: SectionNode[] = [];
    for (const section of content.sections) {
        const [childKeys, childNodes] = buildScriptItems(section.content, actorLookup, pool);
        const node = allocateIn(pool, SectionNode, section.name, depth, childNodes);
        nodes.push(node);
        packs.push({
            key: node.key,
            children: childKeys,
        });
    }
    return [packs, nodes];
}

function buildSupersections(
    content: SupersectionContent,
    actorLookup: Record<string, Actor>,
    pool: PoolType,
): [SupersectionPack[], SectionNode[]] {
    const packs: SupersectionPack[] = [];
    const nodes: SectionNode[] = [];
    for (const supersection of content.supersections) {
        const [childKeys, childNodes] = buildSections(supersection.content, actorLookup, pool, 1);
        const node = allocateIn(pool, SectionNode, supersection.name, 0, childNodes);
        nodes.push(node);
        packs.push({
            key: node.key,
            children: childKeys,
        });
    }
    return [packs, nodes];
}

function buildStructure(
    content: SupersectionContent | SectionContent | ItemsContent,
    actorLookup: Record<string, Actor>,
    pool: PoolType,
): [Structure, (ActionNode | DialogueNode | SectionNode)[]] {
    if (isItemsContent(content)) {
        const [keys, nodes] = buildScriptItems(content, actorLookup, pool);
        return [
            {
                depth: 0,
                children: keys,
            },
            nodes,
        ];
    } else if (isSectionContent(content)) {
        const [packs, nodes] = buildSections(content, actorLookup, pool, 0);
        return [
            {
                depth: 1,
                children: packs,
            },
            nodes,
        ];
    }
    const [packs, nodes] = buildSupersections(content, actorLookup, pool);
    return [
        {
            depth: 2,
            children: packs,
        },
        nodes,
    ];
}

declare const brand: unique symbol;
export type Keyed<T extends Keyed<T>> = { key: Key<T> };
export type Key<T extends Keyed<T>> = string & { [brand]: T };

type Prefix = string & { [brand]: Prefix };

// FIXME: this breaks on reload, use better system.
const reversePrefixLookup: Record<string, object> = {};

function makePrefix(): Prefix {
    return randomID(4) as Prefix;
}

function makeKey<T extends Keyed<T>>(klass: Constructor<T>): Key<T> {
    reversePrefixLookup[klass.prefix] = klass.prototype;
    return `${klass.prefix}-${randomID()}` as Key<T>;
}

export function keyOfType<T extends Keyed<T>>(key: Key<any>, klass: Constructor<T>): key is Key<T> {
    const prototype = reversePrefixLookup[key.slice(0, 4)];
    if (prototype === undefined) return false;
    return klass.prototype === prototype || klass.prototype.isPrototypeOf(prototype);
}

export class Actor implements BaseActor {
    static readonly prefix = makePrefix();

    constructor(
        public key: ActorKey,
        public name: string,
        public color: Color,
    ) {}
}

export type ActorKey = Key<Actor>;

export abstract class ScriptNode {
    abstract key: Key<ScriptNode>;
    public parent: Key<SectionNode> | null = null;
}

export abstract class ContentfulScriptNode extends ScriptNode {
    abstract key: Key<ContentfulScriptNode>;
    public content: FormattedString | EditorState;

    // TODO: this state should be interdependent on who is selected as selfActor
    public markedAsContext: boolean = false;

    constructor(public text: string) {
        super();
        this.content = renderBBCode(this.text);
    }

    get editing(): boolean {
        return this.content instanceof EditorState;
    }
}

export class ActionNode extends ContentfulScriptNode {
    static readonly prefix = makePrefix();

    constructor(
        public key: Key<ActionNode>,
        text: string,
    ) {
        super(text);
    }
}

export class DialogueNode extends ContentfulScriptNode {
    static readonly prefix = makePrefix();

    constructor(
        public key: Key<DialogueNode>,
        public actors: readonly ActorKey[],
        text: string,
    ) {
        super(text);
    }
}

function isItemsContent(content: object | ItemsContent): content is ItemsContent {
    return 'items' in content;
}

function isSectionContent(content: object | SectionContent): content is SectionContent {
    return 'sections' in content;
}

// NOTE: These have to be kept like that (physically containing thier children, since an updat to a
// child *might* cause these to update as well (e.g. adding/removing an actor not prevoiusly/only
// once in the section). Building around that seems painful and unstable, so definetely won't do
// that for now. Update the stateful parts as you're supposed to!
// NOTE: changes to the strcture are different from the issues mentioned in the comment above

export class SectionNode extends ScriptNode {
    static readonly prefix = makePrefix();

    public actors: Map<ActorKey, number>;
    public dialogueCount: number;
    public editing: boolean = false;

    constructor(
        public key: Key<SectionNode>,
        public name: string,
        public depth: 0 | 1,
        public children: (ActionNode | DialogueNode | SectionNode)[],
    ) {
        super();
        const { actors, dialogueCount } = computeMetaInformation(children);
        this.actors = actors;
        this.dialogueCount = dialogueCount;
        for (let child of children) child.parent = key;
    }
}

type MetaInformation = {
    actors: Map<ActorKey, number>;
    dialogueCount: number;
};

function computeMetaInformation(
    nodes: Iterable<ActionNode | DialogueNode | SectionNode>,
): MetaInformation {
    const actors = new Map<ActorKey, number>();
    const addOne = (key: ActorKey) => {
        actors.set(key, (actors.get(key) ?? 0) + 1);
    };
    const addMultiple = (value: number, key: ActorKey) => {
        actors.set(key, (actors.get(key) ?? 0) + value);
    };
    let dialogueCount = 0;
    for (let node of nodes) {
        if (node instanceof DialogueNode) {
            dialogueCount++;
            node.actors.forEach(addOne);
        } else if (node instanceof SectionNode) {
            dialogueCount += node.dialogueCount;
            node.actors.forEach(addMultiple);
        }
    }

    return {
        actors,
        dialogueCount,
    };
}

interface Constructor<T extends Keyed<T>, Args extends unknown[] = any[]> {
    prefix: Prefix;
    prototype: object;
    new (key: Key<T>, ...args: Args): T;
}

function cloneUpdate<T>(obj: T, update: Partial<T>): T {
    return Object.assign(Object.create(Object.getPrototypeOf(obj)), obj, update);
}

type PoolType = ImmutableMap<Key<any>, Keyed<any>>;

function withNewPool<T>(f: (pool: PoolType) => T): [PoolType, T] {
    const tempMap = ImmutableMap<Key<any>, Keyed<any>>();
    let result: T | undefined;
    const map = tempMap.withMutations(map => {
        result = f(map);
    });
    if (result === undefined) throw new Error("callback didn't produce result");

    return [map, result];
}

function poolWithMutations<T>(pool: PoolType, f: (pool: PoolType) => T): [PoolType, T] {
    let result: T | undefined;
    const map = pool.withMutations(map => {
        result = f(map);
    });
    if (result === undefined) throw new Error("callback didn't produce result");

    return [map, result];
}

function allocateIn<T extends Keyed<T>, Args extends unknown[]>(
    pool: PoolType,
    klass: Constructor<T, Args>,
    ...args: Args
): T {
    const key: Key<T> = makeKey(klass);
    const object = new klass(key, ...args);
    pool.set(key, object);
    return object;
}

function lookupIn<T extends Keyed<T>>(pool: PoolType, key: Key<T>): Readonly<T> {
    const object = pool.get(key);
    if (object === undefined) throw new Error(`key '${key}' not in pool`);
    return object as T;
}

export class ScriptEditorState {
    public name: string;
    public actors: Map<ActorKey, number>;
    public selfActor: ActorKey | null;
    public structure: Readonly<Structure>;
    public dialogueCount: number;
    public currentEditedItem: Key<ContentfulScriptNode> | null;
    protected metadata: Map<Symbol, any>;
    protected pool: PoolType;

    constructor(
        name: string,
        actors: Map<ActorKey, number>,
        selfActor: ActorKey | null,
        structure: Structure,
        dialogueCount: number,
        currentEditedItem: Key<ContentfulScriptNode> | null,
        metadata: Map<Symbol, any>,
        nodePool: PoolType,
    ) {
        this.name = name;
        this.actors = actors;
        this.selfActor = selfActor;
        this.structure = structure;
        this.dialogueCount = dialogueCount;
        this.currentEditedItem = currentEditedItem;
        this.metadata = metadata;
        this.pool = nodePool;
    }

    lookup<T extends Keyed<T>>(key: Key<T>): Readonly<T> {
        return lookupIn(this.pool, key);
    }

    static build(script: Script): ScriptEditorState {
        const doc = script.document;
        const [pool, { selfActor, structure, nodes }] = withNewPool(pool => {
            const actorLookup: Record<string, Actor> = {};
            for (let name of doc.allActors) {
                const actor = allocateIn(
                    pool,
                    Actor,
                    name,
                    ensureColor(script.settings.colors[name]),
                );
                actorLookup[name] = actor;
            }
            const selfActor =
                script.settings.selfActor !== null
                    ? actorLookup[script.settings.selfActor].key
                    : null;

            const [structure, nodes] = buildStructure(doc.content, actorLookup, pool);
            return { selfActor, structure, nodes };
        });
        const { actors, dialogueCount } = computeMetaInformation(nodes);
        return new ScriptEditorState(
            script.name,
            actors,
            selfActor,
            structure,
            dialogueCount,
            null,
            new Map(),
            pool,
        );
    }

    visitNodes(visitor: (node: Key<any>) => void) {
        for (let key of this.pool.keys()) visitor(key);
    }

    getMeta(key: Symbol): any {
        return this.metadata.get(key);
    }

    update(updater: (trans: TransientState) => unknown): [ScriptEditorState, Set<Key<any>>] {
        const [pool, trans] = poolWithMutations(this.pool, pool => {
            const trans = new TransientState(
                this.name,
                this.actors,
                this.selfActor,
                this.structure,
                this.dialogueCount,
                this.currentEditedItem,
                new Map(),
                pool,
            );

            const transProxy = new Proxy<TransientState>(trans, {
                set(target, p, newValue, receiver) {
                    target.changes.add('' as Key<any>);
                    return Reflect.set(target, p, newValue, receiver);
                },
            });

            updater(transProxy);
            return trans;
        });

        return [
            new ScriptEditorState(
                trans.name,
                trans.actors,
                trans.selfActor,
                trans.structure,
                trans.dialogueCount,
                trans.currentEditedItem,
                trans.metadata,
                pool,
            ),
            trans.changes,
        ];
    }
}

function deepcopyStructure(structure: Structure): Structure {
    switch (structure.depth) {
        case 0:
            return {
                depth: 0,
                children: [...structure.children],
            };
        case 1:
            return {
                depth: 1,
                children: structure.children.map(sectionPack => ({
                    key: sectionPack.key,
                    children: [...sectionPack.children],
                })),
            };
        case 2:
            return {
                depth: 2,
                children: structure.children.map(supersectionPack => ({
                    key: supersectionPack.key,
                    children: supersectionPack.children.map(sectionPack => ({
                        key: sectionPack.key,
                        children: [...sectionPack.children],
                    })),
                })),
            };
    }
}

export function structureGetChildIndex(
    structure: { children: SectionKeyPack<any>[] | ScriptItemKey[] },
    nodeKey: Key<ScriptNode>,
): number {
    return structure.children.findIndex(child =>
        typeof child === 'string' ? child === nodeKey : child.key === nodeKey,
    );
}

function getNodeReprsentationForStructure(
    node: ActionNode | DialogueNode | SectionNode,
): ScriptItemKey | SectionPack {
    if (node instanceof SectionNode) {
        return {
            key: node.key,
            children: node.children.map(child => child.key as ScriptItemKey),
        };
    }
    return node.key;
}

// function* iterItemNodes(nodes: ScriptItemKey[], state: ScriptEditorState): Generator<ActionNode | DialogueNode> {
//     for (let node of nodes)
//         yield state.lookup(node);
// }
//
// function* iterSectionNodes(nodes: SectionPack[], state: ScriptEditorState): Generator<ActionNode | DialogueNode | SectionNode> {
//     for (let node of nodes) {
//         yield state.lookup(node.key);
//         yield* iterItemNodes(node.children, state);
//     }
// }
//
// function* iterSupersectionNodes(nodes: SupersectionPack[], state: ScriptEditorState): Generator<ActionNode | DialogueNode | SectionNode> {
//     for (let node of nodes) {
//         yield state.lookup(node.key);
//         yield* iterSectionNodes(node.children, state);
//     }
// }

function getNodesIterator(
    state: ScriptEditorState,
): IteratorObject<ActionNode | DialogueNode | SectionNode> {
    switch (state.structure.depth) {
        case 0:
            return Iterator.from(state.structure.children).map(key => state.lookup(key));
        case 1:
            return Iterator.from(state.structure.children).map(node => state.lookup(node.key));
        case 2:
            return Iterator.from(state.structure.children).map(node => state.lookup(node.key));
    }
}

export class TransientState extends ScriptEditorState {
    public changes = new Set<Key<any>>();

    setMeta(key: Symbol, metadata: any) {
        this.metadata.set(key, metadata);
    }

    allocate<T extends Keyed<T>, Args extends unknown[]>(
        klass: Constructor<T, Args>,
        ...args: Args
    ): T {
        return allocateIn(this.pool, klass, ...args);
    }

    private updateObject<T extends Keyed<T>>(object: T, data: Partial<T>): T {
        const newObject = cloneUpdate(object, data);
        this.pool.set(object.key, newObject);
        this.changes.add(object.key);
        return newObject;
    }

    /**
     * Replaces a node in the with (partially) fresh data. Maintains the invariants of the tree as
     * long as the mutation leaves relevant data (e.g. children and parent pointers) untouched.
     *
     * NOTE: This function won't cause upates to `Structure`
     */
    replaceNode<T extends Keyed<T>>(key: Key<T>, data: Partial<T>): Readonly<T> {
        const object = this.lookup(key);
        const result = this.updateObject(object, data);

        let node: Readonly<Keyed<any>> = object;
        let newObject: Keyed<any> = result;
        while (node instanceof ScriptNode && node.parent !== null) {
            const parent = this.lookup(node.parent);
            const index = parent.children.indexOf(node as any);
            if (index === -1) throw Error('invariant violated: parent needs to contain its child');
            const children = [
                ...parent.children.slice(0, index),
                newObject as any,
                ...parent.children.slice(index + 1),
            ];
            const { actors, dialogueCount } = computeMetaInformation(children);
            newObject = this.updateObject(parent, {
                children,
                actors,
                dialogueCount,
            });
            node = parent;
        }

        return result;
    }

    /**
     * Removes a node (ScriptNode) from the tree, while maintaining the invariants of the tree.
     *
     * NOTE: This function causes upates to `Structure`
     */
    removeNode(key: Key<ScriptNode>) {
        let node = this.lookup(key);
        this.unlinkNode(key);

        // FIXME: maybe we can make it work without deepcopying the entire structure (eventually)
        const structure = deepcopyStructure(this.structure);

        const [pack, idx] = this.rebuildStructure(node, structure);
        pack.children.splice(idx, 1);

        this.structure = structure;
    }

    insertNode(
        node: ActionNode | DialogueNode | SectionNode,
        index: number,
        sectionNode: Readonly<SectionNode> | undefined,
    ) {
        const structure = deepcopyStructure(this.structure);

        let pack: Structure | SectionPack | SupersectionPack;
        if (sectionNode !== undefined) {
            const newNode = this.updateObject(sectionNode, {
                children: sectionNode.children.toSpliced(index, 0, node),
            });
            node.parent = sectionNode.key;

            const [sectionPack, idx] = this.rebuildStructure(sectionNode, structure, newNode);
            const innerPack = sectionPack.children[idx];
            if (typeof innerPack === 'string') throw 'invalid invariant';
            pack = innerPack;
        } else {
            pack = structure;
        }

        pack.children.splice(index, 0, getNodeReprsentationForStructure(node) as any);
        this.structure = structure;
    }

    private rebuildStructure(
        node: ScriptNode,
        structure: Structure,
        newNode?: ScriptNode | undefined,
    ): [Structure | SupersectionPack | SectionPack, number] {
        if (node.parent === null)
            // We've found a root-level node.
            return [structure, structureGetChildIndex(structure, node.key)];

        const parent = this.lookup(node.parent);
        const index = parent.children.indexOf(node as any);
        if (index === -1) throw Error('invariant violated: parent needs to contain its child');
        const nodeChildren: (ActionNode | DialogueNode | SectionNode)[] =
            newNode === undefined
                ? [...parent.children.slice(0, index), ...parent.children.slice(index + 1)]
                : [
                      ...parent.children.slice(0, index),
                      newNode as any,
                      ...parent.children.slice(index + 1),
                  ];
        const { actors, dialogueCount } = computeMetaInformation(nodeChildren);
        const nextNewNode = this.updateObject(parent, {
            children: nodeChildren,
            actors,
            dialogueCount,
        });

        const [pack, idx] = this.rebuildStructure(parent, structure, nextNewNode);

        const nextPack = pack.children[idx];
        if (typeof nextPack === 'string') throw 'invalid invariant';

        return [nextPack, structureGetChildIndex(nextPack, node.key)];
    }

    unlinkNode<T extends Keyed<T>>(key: Key<T>) {
        this.pool.delete(key);
    }

    recomputeSectionMetaInfo() {
        for (let change of this.changes.values()) {
            if (!keyOfType(change, SectionNode)) continue;
            const section = this.lookup(change);

            const meta = computeMetaInformation(section.children);
            this.replaceNode(section.key, meta);
        }
        const { actors, dialogueCount } = computeMetaInformation(getNodesIterator(this));
        this.actors = actors;
        this.dialogueCount = dialogueCount;
    }
}

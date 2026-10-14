import { Map } from 'immutable';

import { FormattedString, renderBBCode } from 'quipt/formatted-string';
import type {
    Script,
    ItemsContent,
    SectionContent,
    SupersectionContent,
} from 'quipt/schemas/script';
import { type Actor as BaseActor, randomID } from 'quipt/utils';
import type { Color } from 'quipt/color-palette';

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
                const node = allocateIn(pool, ActionNode, renderBBCode(item.content));
                nodes.push(node);
                keys.push(node.key);
                break;
            }
            case 'dialogue': {
                const node = allocateIn(
                    pool,
                    DialogueNode,
                    item.actors.map(actor => actorLookup[actor].key),
                    renderBBCode(item.content),
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
    depth: 0 | 1
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

type Prefix = string & { [brand]: Prefix; };

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
}

export abstract class EditableSectionNode extends ScriptNode {
    abstract key: Key<EditableSectionNode>;
    abstract content: FormattedString;
}

export class ActionNode extends EditableSectionNode {
    public editing = false;
    static readonly prefix = makePrefix();

    constructor(
        public key: Key<ActionNode>,
        public content: Readonly<FormattedString>,
    ) {
        super();
    }
}

export class DialogueNode extends EditableSectionNode {
    public editing = false;
    static readonly prefix = makePrefix();

    constructor(
        public key: Key<DialogueNode>,
        public actors: readonly ActorKey[],
        public content: Readonly<FormattedString>,
    ) {
        super();
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

export class SectionNode implements ScriptNode {
    public actors: readonly ActorKey[];
    public dialogueCount: number;
    static readonly prefix = makePrefix();

    constructor(
        public key: Key<SectionNode>,
        public name: string,
        public depth: 0 | 1,
        public children: (ActionNode | DialogueNode | SectionNode)[],
    ) {
        const [actors, dialogueCount] = computeMetaInformation(children);
        this.actors = actors;
        this.dialogueCount = dialogueCount;
    }
}

function computeMetaInformation(
    nodes: (ActionNode | DialogueNode | SectionNode)[],
): [ActorKey[], number] {
    const actors = new Set<ActorKey>();
    const add = actors.add.bind(actors);
    let dialogueCount = 0;
    for (let node of nodes) {
        if (node instanceof DialogueNode) {
            dialogueCount++;
            node.actors.forEach(add);
        } else if (node instanceof SectionNode) {
            dialogueCount += node.dialogueCount;
            node.actors.forEach(add);
        }
    }
    return [Array.from(actors), dialogueCount];
}

interface Constructor<T extends Keyed<T>, Args extends unknown[] = any[]> {
    prefix: Prefix;
    prototype: object;
    new (key: Key<T>, ...args: Args): T;
}

function cloneUpdate<T>(obj: T, update: Partial<T>): T {
    return Object.assign(Object.create(Object.getPrototypeOf(obj)), obj, update);
}

type PoolType = Map<Key<any>, Keyed<any>>;

function withNewPool<T>(f: (pool: PoolType) => T): [PoolType, T] {
    const tempMap = Map<Key<any>, Keyed<any>>();
    let result: T | undefined;
    const map = tempMap.withMutations(map => {
        result = f(map);
    });
    if (result === undefined) throw new Error("callback didn't produce result");

    return [map, result];
}

function allocateIn<T extends Keyed<T>, Args extends unknown[]>(
    pool: PoolType,
    klass: Constructor<T, Args>,
    ...args: Args
): Readonly<T> {
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

type UpdateDesc<T extends Keyed<T>> = {
    key: Key<T>;
    data: Partial<T>;
};

// Remember: no getters in here, everything is computed at creation
export class ScriptViewState {
    public name: string;
    public actors: readonly ActorKey[];
    public structure: Readonly<Structure>;
    public dialogueCount: number;
    private pool: PoolType;

    constructor(
        name: string,
        actors: readonly ActorKey[],
        structure: Structure,
        nodes: (ActionNode | DialogueNode | SectionNode)[],
        nodePool: PoolType,
    ) {
        this.name = name;
        this.actors = actors;
        this.structure = structure;
        this.pool = nodePool;
        const [_, dialogueCount] = computeMetaInformation(nodes);
        this.dialogueCount = dialogueCount;
    }

    lookup<T extends Keyed<T>>(key: Key<T>): Readonly<T> {
        return lookupIn(this.pool, key);
    }

    update<T extends Keyed<T>>(update: UpdateDesc<T>): ScriptViewState {
        const pool = this.pool.withMutations(pool => {
            const object = lookupIn(pool, update.key);
            const newObject = cloneUpdate(object, update.data);
            pool.set(update.key, newObject);
        });
        
        return cloneUpdate<any>(this, { pool });
    }

    static build(script: Script): ScriptViewState {
        const [pool, [actors, structure, nodes]] = withNewPool(pool => {
            const actorLookup: Record<string, Actor> = {};
            const actors = script.allActors.map(name => {
                const actor = allocateIn(pool, Actor, name, randomColor());
                actorLookup[name] = actor;
                return actor.key;
            });

            const [structure, nodes] = buildStructure(script.content, actorLookup, pool);
            return [actors, structure, nodes];
        });
        return new ScriptViewState(script.name, actors, structure, nodes, pool);
    }
}

function randomColor(): Color {
    return (Math.floor(24 * Math.random()) + 1) as Color;
}

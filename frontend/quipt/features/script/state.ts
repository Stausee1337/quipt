import { FormattedString, renderBBCode } from 'quipt/formatted-string';
import type { Script, ScriptItem, ItemsContent } from 'quipt/schemas/script';
import { type Actor, randomID } from 'quipt/utils';
import type { Color } from 'quipt/color-palette';

declare const brand: unique symbol;
export type ActorKey = string & { [brand]: ActorKey };

export abstract class SectionItem {
    protected constructor(public readonly ID: string) {}
}

export class ActionItem extends SectionItem {
    public constructor(
        ID: string,
        public readonly content: FormattedString,
    ) {
        super(ID);
    }
}

export class DialogueItem extends SectionItem {
    public constructor(
        ID: string,
        public readonly actors: readonly ActorKey[],
        public readonly content: FormattedString,
    ) {
        super(ID);
    }
}

export class DividerItem extends SectionItem {
    public constructor(
        ID: string,
        public readonly name: string,
    ) {
        super(ID);
    }
}

function isItemsContent(content: object | ItemsContent): content is ItemsContent {
    return 'items' in content;
}

export class Section {
    public readonly actors: readonly ActorKey[];
    public readonly dialogueCount: number;

    private constructor(
        public readonly ID: string,
        public readonly name: string | null,
        public readonly items: SectionItem[],
    ) {
        let dialogueCount = 0;
        const collection = new Set<ActorKey>();
        const add = collection.add.bind(collection);

        for (let item of this.items) {
            if (item instanceof DialogueItem) item.actors.forEach(add);
            dialogueCount++;
        }
        this.actors = Array.from(collection);
        this.dialogueCount = dialogueCount;
    }

    static build(script: Script, reverseActorLookup: Record<string, ActorKey>): Section[] {
        if (isItemsContent(script.content))
            return [
                new Section(
                    randomID(),
                    null,
                    mapScriptItems(script.content.items, reverseActorLookup),
                ),
            ];

        return script.content.sections.map(section => {
            const items = isItemsContent(section.content)
                ? mapScriptItems(section.content.items, reverseActorLookup)
                : section.content.subsections.flatMap(subsection => [
                      new DividerItem(randomID(), subsection.name),
                      ...mapScriptItems(subsection.content.items, reverseActorLookup),
                  ]);

            return new Section(randomID(), section.name, items);
        });
    }
}

function mapScriptItems(
    items: ScriptItem[],
    reverseActorLookup: Record<string, ActorKey>,
): SectionItem[] {
    return items.map(item => {
        switch (item.kind) {
            case 'action':
                return new ActionItem(randomID(), renderBBCode(item.content));
            case 'dialogue':
                return new DialogueItem(
                    randomID(),
                    item.actors
                        .map(name => reverseActorLookup[name])
                        .filter(actor => actor !== undefined),
                    renderBBCode(item.content),
                );
        }
    });
}

export class ScriptViewState {
    public readonly dialogueCount: number;
    public readonly actors: readonly ActorKey[];
    private readonly actorLookup: Record<ActorKey, Actor>;

    private constructor(
        public readonly name: string,
        public readonly sections: readonly Section[],
        actors: Record<ActorKey, Actor>,
    ) {
        this.dialogueCount = sections.reduce((count, section) => count + section.dialogueCount, 0);
        this.actors = Object.keys(actors) as ActorKey[];
        this.actorLookup = actors;
    }

    lookupActor(key: ActorKey): Actor {
        const actor = this.actorLookup[key];
        if (actor === undefined) throw new Error('Invalid `ActorKey` used on state.');
        return actor;
    }

    static create(script: Script): ScriptViewState {
        const actors: Record<ActorKey, Actor> = {};
        const reverseActorLookup: Record<string, ActorKey> = {};
        for (let name of script.allActors) {
            const id = randomID() as ActorKey;
            actors[id] = { name: name, color: randomColor() };
            reverseActorLookup[name] = id;
        }

        const sections = Section.build(script, reverseActorLookup);
        return new ScriptViewState(script.name, sections, actors);
    }
}

function randomColor(): Color {
    return Math.floor(24 * Math.random()) as Color;
}

let globalScriptViewState: ScriptViewState | undefined;

export function useScriptViewState(): ScriptViewState {
    return globalScriptViewState!;
}

export function setGlobalScriptViewState(state: ScriptViewState) {
    globalScriptViewState = state;
}

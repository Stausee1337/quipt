declare const brand: unique symbol;
export type Ref<T> = string & { [brand]: T };

export type User = {};

export type ScriptSettings = {
    selfActor: string | null;
    colors: Record<string, number>;
};

// Could potentially also be called Version
export type ScriptCommit = {
    parent: Ref<ScriptCommit> | null;
    document: ScriptDocument;
    commiter: Ref<User>;
    commitedAt: number;
};

export type ScriptRepo = {
    name: string;
    commit: Ref<ScriptCommit>;
    settings: ScriptSettings;
};

export type ScriptDocument = {
    allActors: string[];
    content: SupersectionContent | SectionContent | ItemsContent;
};

export type SupersectionContent = {
    supersections: Supersection[];
};

// FIXME: maybe make name optional so sections and supersections can be decided during rendering
export type Supersection = {
    name: string;
    content: SectionContent;
};

export type SectionContent = {
    sections: Section[];
};

export type Section = {
    name: string;
    content: ItemsContent;
};

export type ItemsContent = {
    items: ScriptItem[];
};

export type ScriptItemKind = 'action' | 'dialogue';

export type ScriptItem = {
    kind: ScriptItemKind;
    actors: string[];
    content: string;
};

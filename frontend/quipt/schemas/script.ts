export type Script = {
    allActors: string[];
    content: SupersectionContent | SectionContent | ItemsContent;
    name: string;
};

export type SupersectionContent = {
    supersections: Supersection[];
};

// FIXME: maybe make name optional so sections and subsections can be decided during rendering
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

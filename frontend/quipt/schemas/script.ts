export type Script = {
    allActors: string[];
    content: SectionContent | ItemsContent;
    name: string;
};

export type SectionContent = {
    sections: Section[];
};

export type Section = {
    name: string;
    content: SubsectionContent | ItemsContent;
};

export type SubsectionContent = {
    subsections: Subsection[];
};

export type Subsection = {
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
    content: string[];
};

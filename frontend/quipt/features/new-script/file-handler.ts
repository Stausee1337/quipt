import { Document, type PDFDocument } from 'mupdf';

import {
    type ItemsContent,
    type Script,
    type ScriptItem,
    type Section,
    type SectionContent,
    type Supersection,
    type SupersectionContent,
} from 'quipt/schemas/script';
import {
    type ActionBlock,
    type BaseBlock,
    type DialogueBlock,
    type OtherBlock,
    type Page,
    analyzeDocument,
    convertDocument,
} from '../../../pdf-ir';

import type * as types from './types';

type SectionName = 'act' | 'szene';

function detectSectionName(block: OtherBlock): SectionName {
    return block.text.match(/\bSzene\b/) !== null ? 'szene' : 'act';
}

type ItemsLayer = {
    type: 'items';
    content: ScriptItem[];
};

type SectionLayer = {
    type: 'section';
    sectionName: SectionName;
    content: Section[];
    parent?: Supersection;
};

type SupersectionLayer = {
    type: 'supersection';
    sectionName: SectionName;
    content: Supersection[];
};

type Layer = SupersectionLayer | SectionLayer | ItemsLayer;

function layerToContent(layer: Layer): ItemsContent | SectionContent | SupersectionContent {
    switch (layer.type) {
        case 'items':
            return { items: layer.content };
        case 'section':
            return { sections: layer.content };
        case 'supersection':
            return { supersections: layer.content };
    }
}

function flattenBlockText(block: BaseBlock): string {
    return block.text
        .split('\n')
        .map(line => line.trimEnd() + ' ')
        .join('');
}

function createSectionLayer(sectionName: SectionName, currentItems: ScriptItem[]): SectionLayer {
    const sections: Section[] = [];
    if (currentItems.length > 0)
        sections.push({
            name: 'Unbenannter Abschnitt',
            content: { items: currentItems },
        });
    return {
        type: 'section',
        sectionName,
        content: sections,
    };
}

function convertToSupersectionLayer(layer: SectionLayer): SupersectionLayer {
    const supersections: Supersection[] = [];
    if (layer.content.length === 0)
        throw new Error('invalid empty SectionLayer');

    if (layer.content.length > 1)
        supersections.push({
            name: 'Unbenannter Überabschnitt',
            content: { 
                sections: [
                    ...layer.content.slice(-1)
                ]
            },
        });
    const last = layer.content.at(-1)!;

    const sections: Section[] = [];
    supersections.push({
        name: last.name,
        content: { sections }
    });
    if (last.content.items.length > 0)
        sections.push({
            name: 'Unbenannter Abschnitt',
            content: last.content,
        })

    return {
        type: 'supersection',
        sectionName: layer.sectionName,
        content: supersections,
    };
}

// THIS should become a method
function createSection(items: ScriptItem[], blockOrName: string | OtherBlock): Section {
    return {
        name: typeof blockOrName === 'string'
            ? blockOrName
            : flattenBlockText(blockOrName).trim(),
        content: { items },
    };
}

// THIS should become a method
function createSupersection(block: string | OtherBlock): Supersection {
    return {
        name: typeof block === 'string'
            ? block
            : flattenBlockText(block).trim(),
        content: { sections: [] },
    };
}

class ScriptBuilder {
    currentItems: ScriptItem[] = [];
    collectedActors: Set<string> = new Set();
    layer: Layer;
    title: string | undefined = undefined;

    constructor() {
        this.layer = { type: 'items', content: this.currentItems };
    }

    visitActionBlock(block: ActionBlock) {
        this.currentItems.push({
            kind: 'action',
            content: block.formattedString,
            actors: [],
        });
    }

    visitDialogueBlock(block: DialogueBlock) {
        for (let actor of block.actorNames) this.collectedActors.add(actor);
        this.currentItems.push({
            kind: 'dialogue',
            content: block.formattedString,
            actors: block.actorNames,
        });
    }

    visitSectionBlock(block: OtherBlock) {
        const sectionName = detectSectionName(block);
        if (this.layer.type === 'items') {
            this.layer = createSectionLayer(sectionName, this.currentItems);
            this.currentItems = [];
            this.layer.content.push(createSection(this.currentItems, block));
        } else if (this.layer.type === 'section') {
            if (sectionName === this.layer.sectionName) {
                this.currentItems = [];
                this.layer.content.push(createSection(this.currentItems, block));
                return;
            }
            this.layer = convertToSupersectionLayer(this.layer);
            this.currentItems = [];
            this.layer.content.at(-1)!.content.sections.push(createSection(this.currentItems, block));
        } else if (this.layer.type === 'supersection') {
            if (sectionName === this.layer.sectionName) {
                this.currentItems = [];
                this.layer.content.push(createSupersection(block));
                return;
            }
            this.currentItems = [];
            this.layer.content.at(-1)!.content.sections.push(createSection(this.currentItems, block));
        }
    }

    visitTitleBlock(block: OtherBlock) {
        if (this.title !== undefined) return;
        this.title = flattenBlockText(block).trim();
    }

    visitBlock(block: BaseBlock) {
        switch (block.type) {
            case 'action':
                this.visitActionBlock(block);
                break;
            case 'dialogue':
                this.visitDialogueBlock(block);
                break;
            case 'section':
                this.visitSectionBlock(block);
                break;
            case 'title':
                this.visitTitleBlock(block);
                break;
            case 'summary':
            case 'unknown':
            case 'header':
            case 'footer':
                break;
        }
    }

    visitPage(page: Page) {
        for (let block of page.blocks) this.visitBlock(block);
    }

    visitDocument(document: Page[]) {
        for (let page of document) this.visitPage(page);
    }

    build(fileName: string): Script {
        return {
            name: this.title ?? fileName,
            content: layerToContent(this.layer),
            allActors: Array.from(this.collectedActors),
        };
    }
}

function mapToScript(document: Page[], fileName: string): Script {
    const builder = new ScriptBuilder();
    builder.visitDocument(document);
    return builder.build(fileName);
}

function stripName(name: string): string {
    if (name.toLowerCase().endsWith('.pdf')) return name.slice(0, -4);
    return name;
}

export function processFile(file: types.File): types.Result {
    let doc: Document;
    try {
        doc = Document.openDocument(file.data);
    } catch {
        return { kind: 'error', error: 'invalid-file-format' };
    }

    if (!doc.isPDF()) return { kind: 'error', error: 'invalid-file-format' };

    let annotatedIR: Page[] | undefined;
    try {
        const baseIR = convertDocument(doc as PDFDocument);
        annotatedIR = analyzeDocument(baseIR);
    } catch (e) {
        console.error(e);
        return { kind: 'error', error: 'internal-error' };
    }

    if (annotatedIR === undefined) return { kind: 'error', error: 'non-script-document' };

    let script;
    try {
        script = mapToScript(annotatedIR, stripName(file.fileName));
    } catch (e) {
        console.error(e);
        return { kind: 'error', error: 'internal-error' };
    }

    return {
        kind: 'success',
        script,
        document: annotatedIR,
    };
}

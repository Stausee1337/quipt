import { Document, type PDFDocument } from 'mupdf';

import {
    type ItemsContent,
    type Script,
    type ScriptItem,
    type Section,
    type SectionContent,
    type Subsection,
    type SubsectionContent,
} from 'quipt/schemas/script';
import {
    type ActionBlock,
    type BaseBlock,
    type DialogueBlock,
    type OtherBlock,
    type Page,
    analyzeDocument,
    convertDocument
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
};

type SubsectionLayer = {
    type: 'subsection';
    sectionName: SectionName;
    parent: SectionLayer;
    content: Subsection[];
};

type Layer = ItemsLayer | SectionLayer | SubsectionLayer;

function layerToContent(layer: Layer, depth: number = 0): ItemsContent | SectionContent {
    switch (layer.type) {
        case 'items':
            return { items: layer.content };
        case 'section':
            return { sections: layer.content };
        case 'subsection':
            if (depth > 0) throw 'recursion error';
            return layerToContent(layer.parent, depth + 1);
    }
}

function isItemsContent(content: ItemsContent | SubsectionContent): content is ItemsContent {
    return Object.keys(content).includes('items');
}

class ScriptBuilder {
    currentItems: ScriptItem[] = [];
    collectedActors: Set<string> = new Set();
    layer: Layer;

    constructor() {
        this.layer = { type: 'items', content: this.currentItems };
    }

    visitActionBlock(block: ActionBlock) {
        this.currentItems.push({
            kind: 'action',
            content: block.formattedString,
            actors: []
        });
    }

    visitDialogueBlock(block: DialogueBlock) {
        for (let actor of block.actorNames)
            this.collectedActors.add(actor);
        this.currentItems.push({
            kind: 'dialogue',
            content: block.formattedString,
            actors: block.actorNames
        });
    }

    visitSectionBlock(block: OtherBlock) {
        const sectionName = detectSectionName(block);
        if (this.layer.type === 'items') {
            // ensure sections layer
            const sections: Section[] = [];
            if (this.currentItems.length > 0) {
                // add current items to on-the-fly section retrospectively
                sections.push({
                    name: 'Unbenannter Abschnitt',
                    content: { items: this.currentItems },
                });
                this.currentItems = [];
            }
            this.layer = {
                type: 'section',
                sectionName,
                content: sections,
            };
        } else if (this.layer.sectionName !== sectionName) {
            if (this.layer.type === 'section') {
                // create "lower" subsection
                let currentSection = this.layer.content.at(-1)!;
                if (isItemsContent(currentSection.content)) {
                    const subsections: Subsection[] = [];
                    if (currentSection.content.items.length > 0)
                        subsections.push({
                            name: 'Unbenannter Unterabschnitt',
                            content: currentSection.content
                        });
                    currentSection.content = { subsections };
                }

                this.layer = {
                    type: 'subsection',
                    sectionName,
                    parent: this.layer,
                    content: currentSection.content.subsections
                };
            } else if (this.layer.type === 'subsection') {
                // decrease the level
                this.layer = this.layer.parent;
            }
        }

        const items: ScriptItem[] = [];
        this.layer.content.push({
            name: block.text,
            content: { items }
        });
        this.currentItems = items;
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
            case 'unknown':
            case 'header':
            case 'footer':
                break;
        }
    }

    visitPage(page: Page) {
        for (let block of page.blocks)
            this.visitBlock(block);
    }

    visitDocument(document: Page[]) {
        for (let page of document)
            this.visitPage(page);
    }

    build(name: string): Script {
        return {
            name,
            content: layerToContent(this.layer),
            allActors: Array.from(this.collectedActors)
        };
    }
}

function mapToScript(name: string, document: Page[]): Script {
    const builder = new ScriptBuilder();
    builder.visitDocument(document);
    return builder.build(name);
}

function stripName(name: string): string {
    if (name.toLowerCase().endsWith('.pdf'))
        return name.slice(0, -4);
    return name;
}

export function processFile(file: types.File): types.Result {
    const doc = Document.openDocument(file.data);
    if (!doc.isPDF()) return { kind: 'error', error: 'invalid-file-format' };

    let annotatedIR: Page[];
    try {
        const baseIR = convertDocument(doc as PDFDocument);
        annotatedIR = analyzeDocument(baseIR);
    } catch (e) {
        console.error(e);
        return { kind: 'error', error: 'internal-error' };
    }

    let script;
    try {
        script = mapToScript(stripName(file.fileName), annotatedIR);
    } catch (e) {
        console.error(e);
        return { kind: 'error', error: 'internal-error' };
    }

    return {
        kind: 'success',
        script: script,
    };
}

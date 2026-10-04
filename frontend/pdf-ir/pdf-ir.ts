import { Font as PDFFont, PDFDocument, PDFPage, Rect as PDFRect, StructuredText } from 'mupdf';

export type ViewLine = {
    x: number;
    y: number;
    width: number;
    height: number;
    minHeight: number;
    styledText: StyledTextSpan[];
};


export type ViewBlock = {
    x: number;
    y: number;
    width: number;
    height: number;

    font: UnstyledFont|undefined;
    lines: BlockLine[];
};

export type BlockLine = {
    // The UnstyledFont is maintained over the entire line. If the line does not maintain an 
    // UnstyledFont over its width (aka font size or family vary throughout) it is set undefined
    font: UnstyledFont|undefined;
    styledText: StyledTextSpan[]
};

export type Block = {
    horizontalSpace: number;
    verticalDistance: number;

    // The UnstyledFont is maintained over the entire block. That means every block lines font 
    // is set to the same UnstyledFont. If it is set to undefined, the block carries one or more 
    // lines with varying font size or family.
    font: UnstyledFont|undefined;
    lines: BlockLine[],
};

export type StyledTextSpan = {
    text: string;
    font: Font;
};

export type FontFamily = 'sans-serif'|'serif'|'monospace';

export type UnstyledFont = {
    size: number;
    family: FontFamily;
};

export type Font = UnstyledFont & {
    style: FontStyles;
};

export enum FontStyles {
    None = 0,
    Bold = 1,
    Italic = 2,
}

export type Page = {
    // FIXME: I don't know if the IR even needs those
    width: number;
    height: number;
    blocks: Block[];
};

export function isSameFont(a: UnstyledFont|undefined, b: UnstyledFont|undefined): boolean {
    return a?.size === b?.size && a?.family === b?.family;
}

export function convertDocument(pdfDoc: PDFDocument): Page[] {
    const allPages = Array.from({ length: pdfDoc.countPages() })
        .map((_, idx) => pdfDoc.loadPage(idx));

    return allPages.map(page => convertPage(page));
}

export function convertPage(page: PDFPage): Page {
    const bounds = page.getBounds();
    const [pageWidth, pageHeight] = toDimensions(bounds);

    const structuredText = page.toStructuredText({});
    const viewLines = buildViewLines(structuredText);
    const viewBlocks = buildViewBlocks(viewLines);
    const irBlocks = buildIRBlocks(viewBlocks!.sort((a, b) => a.y - b.y));

    return {
        width: pageWidth,
        height: pageHeight,
        blocks: irBlocks,
    };
}

function mapFont(font: PDFFont, size: number): Font {
    let style: FontStyles = FontStyles.None;
    if (font.isItalic())
        style |= FontStyles.Italic;
    if (font.isBold())
        style |= FontStyles.Bold;

    let family: FontFamily = 'sans-serif';
    if (font.isSerif())
        family = 'serif';
    else if (font.isMono())
        family = 'monospace';

    return { size: Math.round(size), style, family };
}

type LineBuilder = {
    pushChar(char: string, font: PDFFont, size: number): void;
    build(): ViewLine|undefined;
};

function createLineBuilder(bbox: PDFRect): LineBuilder {
    const textSpanAccumulator: StyledTextSpan[] = [];

    let textAccumulator: string[] = [];
    let currentFont: undefined|Font = undefined;
    return {
        pushChar(char, font, size) {
            const newFont = mapFont(font, size);
            if (currentFont?.style === newFont.style && currentFont?.size === newFont.size) {
                textAccumulator.push(char);
                return;
            }
            if (textAccumulator && currentFont)
                textSpanAccumulator.push({ text: textAccumulator.join(''), font: currentFont });
            textAccumulator = [char]
            currentFont = newFont;
        },
        build(): ViewLine|undefined {
            const [ulx, uly, lrx, lry] = bbox;

            if (textAccumulator && currentFont)
                textSpanAccumulator.push({ text: textAccumulator.join(''), font: currentFont });

            const textSpans = textSpanAccumulator.filter(span => span.text.trim().length > 0)
            if (textSpans.length === 0) return undefined;

            const width = Math.round(lrx - ulx);
            const height = Math.round(lry - uly);
            
            return {
                x: Math.floor(ulx),
                y: Math.floor(uly),
                width,
                height,
                minHeight: Math.min(height, ...textSpanAccumulator.map(span => span.font.size)),
                styledText: textSpans
            };
        },
    };
}

function buildViewLines(structuredText: StructuredText): ViewLine[] {
    const lines: ViewLine[] = [];

    let lineBuilder: LineBuilder|undefined = undefined;
    structuredText.walk({
        beginLine(bbox) {
            lineBuilder = createLineBuilder([...bbox]); 
        },
        onChar(char, _origin, font, size) {
            lineBuilder && lineBuilder.pushChar(char, font, size);
        },
        endLine() {
            const result = lineBuilder && lineBuilder.build();
            if (result) lines.push(result);
            lineBuilder = undefined;
        }
    });

    return lines.sort((a, b) => a.y - b.y);
}

function buildIRBlocks(viewBlocks: ViewBlock[]): Block[] {
    const blocks: Block[] = [];

    for (let i = 0; i < viewBlocks.length; i++) {
        const prev = i > 0 ? viewBlocks[i - 1] : undefined;
        const curr = viewBlocks[i];

        blocks.push({
            verticalDistance: curr.y - ((prev?.y ?? 0) + (prev?.height ?? 0)),
            horizontalSpace: curr.x,
            lines: curr.lines,
            font: curr.font,
        });
    }

    return blocks;
}

function buildViewBlocks(viewLines: ViewLine[]): ViewBlock[] {
    if (!viewLines.length) return [];

    const blocks: ViewBlock[] = [];
    let currentBlock = [viewLines[0]];

    for (let i = 1; i < viewLines.length; i++) {
        const prev = viewLines[i - 1];
        const curr = viewLines[i];
        const verticalGap = curr.y - prev.y;

        const continueCurrentBlock = verticalGap <= prev.height * 1.5;

        if (continueCurrentBlock) {
            currentBlock.push(curr);
            continue;
        }
        subBildViewBlocks(currentBlock, blocks);
        currentBlock = [curr];
    }
    subBildViewBlocks(currentBlock, blocks);

    return blocks;
}

function isSameBlockLine(reference: ViewLine, line: ViewLine): boolean {
    return line.y < (reference.y + reference.minHeight);
}

function getConsistentFont(textSpans: StyledTextSpan[]): UnstyledFont|undefined {
    let currentFont = textSpans[0].font;
    for (let i = 1; i < textSpans.length; i++) {
        const span = textSpans[i];
        if (!isSameFont(currentFont, span.font)) return undefined;
    }
    return currentFont;
}

type BlockLineWithPosition = BlockLine & {
    xMin: number, yMin: number,
    xMax: number, yMax: number,
};

function makeViewBlock(lines: BlockLineWithPosition[]): ViewBlock {
    const xMin = Math.min(...lines.map(line => line.xMin));
    const yMin = Math.min(...lines.map(line => line.yMin));

    const xMax = Math.max(...lines.map(line => line.xMax));
    const yMax = Math.max(...lines.map(line => line.yMax));

    return {
        x: xMin,
        y: yMin,
        width: xMax - xMin,
        height: yMax - yMin,
        font: lines[0].font,
        lines: lines.map(line => ({ font: line.font, styledText: line.styledText }))
    };
}

function subBildViewBlocks(viewLines: ViewLine[], viewBlocks: ViewBlock[]) {
    const tmpLines: BlockLineWithPosition[] = [];

    for (let i = 0; i < viewLines.length;) {
        const start = viewLines[i];
        const currentLineAccumulator = [start];

        while (++i < viewLines.length) {
            const currentLine = viewLines[i];
            if (!isSameBlockLine(start, currentLine))
                break;
            currentLineAccumulator.push(currentLine);
        }

        const textSpans = currentLineAccumulator
            .sort((a, b) => a.x - b.x)
            .flatMap(line => [
                ...line.styledText.slice(0, -1),
                { text: line.styledText.at(-1)!.text + ' ', font: line.styledText.at(-1)!.font }
            ]);

        const xMin = Math.min(...currentLineAccumulator.map(line => line.x));
        const yMin = Math.min(...currentLineAccumulator.map(line => line.y));

        const xMax = Math.max(...currentLineAccumulator.map(line => line.x + line.width));
        const yMax = Math.max(...currentLineAccumulator.map(line => line.y + line.height));

        tmpLines.push({
            styledText: textSpans,
            font: getConsistentFont(textSpans),
            xMin, yMin, xMax, yMax
        });
    }

    let currentBlockAccumualtor: BlockLineWithPosition[] = [tmpLines[0]];
    for (let i = 1; i < tmpLines.length; i++) {
        const currentLine = tmpLines[i];
        if (isSameFont(currentBlockAccumualtor[0].font, currentLine.font)) {
            currentBlockAccumualtor.push(currentLine);
            continue;
        }
        viewBlocks.push(makeViewBlock(currentBlockAccumualtor));
        currentBlockAccumualtor = [currentLine];
    }
    viewBlocks.push(makeViewBlock(currentBlockAccumualtor));
}

function toDimensions(rect: PDFRect): [number, number] {
    const [ulx, uly, lrx, lry] = rect;
    const width = lrx - ulx;
    const height = lry - uly;
    return [width, height];
}

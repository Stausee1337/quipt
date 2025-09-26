import { JSX } from "solid-js";
import type { Font, PDFDocument, StructuredText } from "mupdf"

type MupdfLib = typeof import("mupdf");
type StructuredTextWalker = Parameters<StructuredText['walk']>[0]

type ViewLine = {
    x: number,
    y: number,
    width: number,
    height: number,
    text: string
    fontStyleSpans: FontStyleSpan[]
};

type ViewBlockKind = "cue"|"division"|"info"|"unknown";

type ViewBlock = {
    x: number,
    y: number,
    width: number,
    height: number,
    kind: ViewBlockKind,
    text: string,
    fontStyleSpans: FontStyleSpan[]
};

type FontStyleSpan = {
    start: number,
    end: number,
    styles: FontStyles,
};

enum FontStyles {
    None = 0,
    Italic = 1,
    SerifFont = 2,
    MonsopacedFont = 4,
    Bold = 8
}

type TextWithFormat = { text: string, fontStyleSpans: FontStyleSpan[] };

function getLongestSpan(spans: FontStyleSpan[]): FontStyleSpan {
    const getLength = (s: FontStyleSpan) => s.end - s.start;

    let longest = spans[0];
    let longestLength = getLength(longest);

    for (let i = 1; i < spans.length; i++) {
        const current = spans[i];
        const currentLength = getLength(current);
        if (currentLength > longestLength) {
            longest = current;
            longestLength = currentLength;
        }
    }

    return longest;
}

function getFontStyle(font: Font): FontStyles {
    let style: FontStyles = FontStyles.None;
    if (font.isItalic())
        style |= FontStyles.Italic;
    if (font.isSerif())
        style |= FontStyles.SerifFont;
    if (font.isMono())
        style |= FontStyles.MonsopacedFont;
    if (font.isBold())
        style |= FontStyles.Bold;
    return style;
}

function buildViewLines(structuredText: StructuredText, pageWidth: number): ViewLine[] {
    let fontStyleSpans: FontStyleSpan[]|undefined;
    let stringBuilder: string|undefined;
    let currentFontStyle = FontStyles.None;
    function buildLineText(): StructuredTextWalker {
        return {
            onChar(c, _origin, font) {
                const newFontStyle = getFontStyle(font);
                if (currentFontStyle !== newFontStyle) {
                    currentFontStyle = newFontStyle;
                    pushFontStyle();
                }
                stringBuilder += c;
            },
        };
    }

    function pushFontStyle() {
        const prevStyle = fontStyleSpans!.at(-1);
        const start = stringBuilder!.length;
        if (prevStyle !== undefined) {
            prevStyle.end = start;
            if ((prevStyle.end - prevStyle.start) <= 0)
                fontStyleSpans!.pop();
        }
        fontStyleSpans!.push({
            start, end: -1,
            styles: currentFontStyle
        });
    }

    const viewLines: ViewLine[] = [];
    let currentLine: ViewLine|undefined; 
    structuredText.walk({
        beginLine(bbox) {
            const [ulx, uly, _, lry] = bbox;
            currentLine = {
                x: ulx, y: uly,
                width: pageWidth,
                height: lry - uly,
                text: '',
                fontStyleSpans: []
            };
            currentFontStyle = FontStyles.None;
            stringBuilder = '';
            fontStyleSpans = [];
        },
        endLine() {
            const text = currentLine!.text = stringBuilder!;
            while (true) {
                const lastSpan = fontStyleSpans!.at(-1);
                if (lastSpan === undefined)
                    break;
                lastSpan.end = text.length;
                if ((lastSpan.end - lastSpan.start) > 0)
                    break;
                fontStyleSpans!.pop();
            }
            if (fontStyleSpans!.length === 0)
                fontStyleSpans!.push({
                    start: 0, end: text.length,
                    styles: FontStyles.None
                });
            currentLine!.fontStyleSpans = makeGaplessStyleSpans(fontStyleSpans!);
            viewLines.push(currentLine!);
            currentLine = undefined;
            stringBuilder = undefined;
            fontStyleSpans = undefined;
        },
        ...buildLineText()
    });
    
    return viewLines
        .filter(line => line.text.trim() !== "")
        .sort((a, b) => a.y - b.y);
}

function makeGaplessStyleSpans(spans: FontStyleSpan[]): FontStyleSpan[] {
    let lastEnd = 0;
    const output: FontStyleSpan[] = [];
    for (const span of spans) {
        if (span.start <= lastEnd) {
            output.push(span);
            lastEnd = span.end;
            continue;
        }

        output.push({
            start: lastEnd, end: span.start,
            styles: FontStyles.None
        });
        output.push(span);
        lastEnd = span.end;
    }
    return output;
}

function buildViewBlocks(viewLines: ViewLine[]): ViewBlock[] {
    const blocks: ViewBlock[] = [];
    let currentBlock = [viewLines[0]];

    for (let i = 1; i < viewLines.length; i++) {
        const prev = viewLines[i - 1];
        const curr = viewLines[i];
        const verticalGap = curr.y - prev.y;

        const continueCurrentBlock = verticalGap < prev.height * 1.2
            && !isTextCue(curr);

        if (continueCurrentBlock) {
            currentBlock.push(curr);
            continue;
        }
        blocks.push(convertBlock(currentBlock));
        currentBlock.length = 0;
        currentBlock.push(curr);
    }
    blocks.push(convertBlock(currentBlock));

    return blocks;
}

function convertBlock(currentBlock: ViewLine[]): ViewBlock {
    const first = currentBlock[0];
    const last = currentBlock.at(-1)!;

    const text = currentBlock.map(line => line.text).join('');
    const fontStyleSpans = currentBlock
        .map(line => line.fontStyleSpans)
        .reduce(
            (otherSpans, newSpans) => {
                const prevSpan = otherSpans.at(-1)!;
                const nextSpan = newSpans[0];
                const offset = prevSpan.end ?? 0;
                if (prevSpan.styles === nextSpan.styles) {
                    return [
                        ...otherSpans.slice(0, otherSpans.length - 1),
                        {
                            ...prevSpan,
                            end: nextSpan.end + offset
                        },
                        ...newSpans
                            .slice(1)
                            .map(s => ({
                                ...s,
                                start: s.start + offset,
                                end: s.end + offset
                            }))
                    ];
                }
                return [
                    ...otherSpans,
                    ...newSpans.map(s => ({
                        ...s,
                        start: s.start + offset,
                        end: s.end + offset
                    }))
                ];
            }
        );


    function getKind(): ViewBlockKind {
        if (isTextCue({ text, fontStyleSpans }))
            return "cue";
        const span = getLongestSpan(fontStyleSpans);
        if (span.styles & FontStyles.Italic)
            return "info";
        if (span.styles & FontStyles.Bold)
            return "division";
        return "unknown";
    }

    return {
        x: first.x, y: first.y,
        width: first.width,
        height: (last.y - first.y) + last.height,
        kind: getKind(),
        text, fontStyleSpans
    };
}

const actorsRegex = /^(?:\p{L}| |,)+(?=:)/u;

function isTextCue(fmt: TextWithFormat): boolean {
    const match = fmt.text.match(actorsRegex);
    if (match === null)
        return false;
    const styleSpan = fmt.fontStyleSpans[0];
    const styleLength = styleSpan.end - styleSpan.start;
    return styleLength >= match.length && (styleSpan.styles & FontStyles.Bold) !== 0;
}


const markdownChar = ['_', '', '`', '**'];

function getDelta(prev: FontStyles, next: FontStyles): [number[], number[]] {
    const turnedOn = (~prev) & next
    const turnedOff = prev & (~next)
    const closingDifference: number[] = []
    for (let i = 0; i < 4; i++) {
        const flag: FontStyles = 2 ** i;
        if (turnedOff & flag) {
            closingDifference.push(i)
        }
    }
    const openingDifference = []
    for (let i = 0; i < 4; i++) {
        const flag: FontStyles = 2 ** i;
        if (turnedOn & flag) {
            openingDifference.push(i)
        }
    }
    return [closingDifference, openingDifference]
}

function applyStyle(stack: number[], prev: FontStyles, next: FontStyles): string[] {
    if (prev === next)
        return [];
    const output: string[] = [];

    const [closingDifference, openingDifference] = getDelta(prev, next);
    if (closingDifference.length > 0) {
        while (closingDifference.includes(stack.at(-1) ?? -1)) {
            const idx = stack.pop()!;
            output.push(markdownChar[idx]);
        }
        output.push(' ');
    }

    stack.push(...openingDifference);
    output.push(' ');
    output.push(...openingDifference.map(x => markdownChar[x]))
    return output;
}

function buildMarkdown(
    { text, fontStyleSpans }: TextWithFormat
): string {
    const output = [];

    const stack: number[] = [];
    let currentSpan: FontStyleSpan;
    let prevStyles = FontStyles.None;

    let i = 0;
    do {
        currentSpan = fontStyleSpans[i];

        const content = text.slice(currentSpan.start, currentSpan.end).trim();
        if ((currentSpan.end - currentSpan.start) > 0 && content.length > 0) {
            output.push(...applyStyle(stack, prevStyles, currentSpan.styles));
            prevStyles = currentSpan.styles;

            output.push(content);
        }

        i += 1;
    } while (i < fontStyleSpans.length);

    output.push(...applyStyle(stack, prevStyles, FontStyles.None))

    return output.join('').trim();
}

export function DocumentView(
    props: {
        mupdf: MupdfLib,
        pdfDoc: PDFDocument
    }
): JSX.Element {
    const canvas = <img id="pageCanvas"/> as HTMLImageElement;
    // const textLayerContainer = <div id="textLayer"/> as HTMLDivElement;
    const linesLayer = <div class="lines-layer"/> as HTMLDivElement;
    const { mupdf, pdfDoc } = props;

    const page = pdfDoc.loadPage(4);
    const pixmap = page.toPixmap(mupdf.Matrix.identity, mupdf.ColorSpace.DeviceRGB, false, true)
    const pngImage = pixmap.asPNG() as Uint8Array;
    const src = URL.createObjectURL(new Blob([pngImage], { type: 'image/png' }));
    canvas.src = src;

    const [ulx, _, lrx] = page.getBounds();
    const pageWidth = lrx - ulx;

    const structuredText = page.toStructuredText();
    const viewLines = buildViewLines(structuredText, pageWidth);

    for (const line of viewLines) {
    }

    const viewBlocks = buildViewBlocks(viewLines);

    for (const block of viewBlocks) {
        console.log(buildMarkdown(block))
        const x = <span style={{
                top: `${block.y}px`,
                height: `${block.height}px`,
                width: `${block.width}px`,
            }} 
            data-block-kind={block.kind}
            data-text-content={block.text}/> as HTMLSpanElement;
        linesLayer.appendChild(x);
    }

    // pdfDoc.getPage(5).then(async page => {
    //     const viewport = page.getViewport({ scale: 1 });
    //     const outputScale = window.devicePixelRatio;

    //     canvas.width = Math.floor(viewport.width * outputScale);
    //     canvas.height = Math.floor(viewport.height * outputScale);
    //     canvas.style.width = `${viewport.width}px`;
    //     canvas.style.height = `${viewport.height}px`;

    //     page.render({
    //         canvas,
    //         canvasContext: canvas.getContext('2d')!,
    //         transform: outputScale !== 1
    //             ? [outputScale, 0, 0, outputScale, 0, 0]
    //             : undefined,
    //         viewport
    //     })


    //     const textContent = await page.getTextContent();
    //     const viewLines = buildViewLines.call(pdfjs, viewport, textContent);

    //     const blocks: ViewBlock[] = [];
    //     let currentBlock = [viewLines[0]];

    //     for (let i = 1; i < viewLines.length; i++) {
    //         const prev = viewLines[i - 1];
    //         const curr = viewLines[i];
    //         // const verticalGap = prev.y - curr.y;
    //         const verticalGap = curr.y - prev.y;

    //         if (verticalGap < prev.height * 1.2 &&
    //             curr.text.match(actorsRegex) === null) {
    //             currentBlock.push(curr);
    //             continue;
    //         }
    //         blocks.push(convertBlock(currentBlock));
    //         currentBlock.length = 0;
    //         currentBlock.push(curr);
    //     }
    //     blocks.push(convertBlock(currentBlock));

    //     for (const block of blocks) {
    //         const x = <span style={{
    //             top: `${block.y}px`,
    //             height: `${block.height}px`,
    //             width: `${block.width}px`,
    //         }} data-text-content={block.text}/> as HTMLSpanElement;
    //         linesLayer.appendChild(x);
    //     }


    //     // const textLayer = new pdfjs.TextLayer({
    //     //     textContentSource: textContent,
    //     //     container: textLayerContainer,
    //     //     viewport
    //     // });
    //     // textLayer.render();
    // });

    return (
        <div class="document-view">
            { canvas }
            { linesLayer }
        </div>
    );
}


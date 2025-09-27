import { JSX, Setter, createEffect, createMemo, createSignal, mapArray, onCleanup, onMount } from "solid-js";
import type { Font, PDFDocument, PDFPage, Rect, StructuredText } from "mupdf"
import { pluralize } from "./common";

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

    page: number,
    text: string,
    kind: ViewBlockKind,
    fontStyleSpans: FontStyleSpan[],
    backwardLink?: ViewBlock,
    forwardLink?: ViewBlock,
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

function buildViewBlocks(viewLines: ViewLine[], page: number): ViewBlock[] {
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
        blocks.push(convertBlock(currentBlock, page));
        currentBlock.length = 0;
        currentBlock.push(curr);
    }
    blocks.push(convertBlock(currentBlock, page));

    return blocks;
}

function convertBlock(currentBlock: ViewLine[], page: number): ViewBlock {
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
        if (span.styles & FontStyles.Bold && text.match(/akt|szene/i))
            return "division";
        return "unknown";
    }

    return {
        page,
        x: first.x, y: first.y,
        width: first.width,
        height: (last.y - first.y) + last.height,
        kind: getKind(),
        text, fontStyleSpans
    };
}

const actorsRegex = /^(?:\p{L}| |,|\.)+(?=:)/u;

function isTextCue(fmt: TextWithFormat): boolean {
    const match = fmt.text.match(actorsRegex);
    if (match === null)
        return false;
    const styleSpan = fmt.fontStyleSpans[0];
    const styleLength = styleSpan.end - styleSpan.start;
    return styleLength >= match.length && (styleSpan.styles & FontStyles.Bold) !== 0;
}

type PageInfo = {
    index: number,
    viewBlocks: ViewBlock[],
    divisions: ViewBlock[]
};

function computePageInfo(page: PDFPage, index: number): PageInfo {
    const [pageWidth] = toDimensions(page.getBounds());

    const structuredText = page.toStructuredText();
    const viewLines = buildViewLines(structuredText, pageWidth);
    const viewBlocks = buildViewBlocks(viewLines, index);

    const divisions = viewBlocks.filter(block => block.kind === "division")

    return {
        index,
        viewBlocks,
        divisions
    };
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

function toDimensions(rect: Rect): [number, number] {
    const [ulx, uly, lrx, lry] = rect;
    const width = lrx - ulx;
    const height = lry - uly;
    return [width, height];
}

const pageMarginLeft = 45;
const fontSize = 13;

const ONE_THIRD = 1/3;
const TWO_THIRDS = 2/3;

interface PageRenderer {
    render(page: PDFPage): OffscreenCanvas;
    readonly scaleFactor: number;
}

function PageView(
    props: {
        index: number,
        page: PDFPage,
        viewBlocks: ViewBlock[],
        renderer: PageRenderer
    }
): JSX.Element {
    const { page, viewBlocks, index, renderer } = props;
    const scaleFactor = renderer.scaleFactor;

    const [pageWidth, pageHeight] = toDimensions(page.getBounds());

    const canvas = <canvas class="page-canvas"
        width={pageWidth * scaleFactor}
        height={pageHeight * scaleFactor}/> as HTMLCanvasElement;
    let imageLoaded = false;

    const observer = new IntersectionObserver(entries => {
        if (imageLoaded) return;
        if (!entries[0].isIntersecting) return;

        const ctx = canvas.getContext("2d")!;
        const imageCanvas = renderer.render(page);

        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(imageCanvas, 0, 0);

        imageLoaded = true;
    });

    onMount(() => {
        observer.observe(canvas);
    })

    onCleanup(() => {
        observer.unobserve(canvas);
    })

    const linesLayer = <div class="lines-layer" 
        style={{
            width: `${pageWidth * scaleFactor}px`,
            height: `${pageHeight * scaleFactor}px`,
        }}/> as HTMLDivElement;

    const indentationInfo = <svg viewBox={`0 0 ${pageMarginLeft} ${pageHeight}`}
        width={`${(pageMarginLeft / pageWidth) * 100}%`}
        height="100%"/> as SVGSVGElement;

    linesLayer.appendChild(indentationInfo);

    for (const block of viewBlocks) {
        const x = <span style={{
                top: `${(block.y / pageHeight) * 100}%`,
                height: `${(block.height / pageHeight) * 100}%`,
                width: `${(block.width / pageWidth) * 100}%`,
            }} 
            classList={{[block.kind]: true}}
            data-text-content={block.text}/> as HTMLSpanElement;
        linesLayer.appendChild(x);

        if (block.kind === "unknown")
            continue;
        const dist = block.kind === "division" ? ONE_THIRD : TWO_THIRDS ;

        const [sx, sy] = [pageMarginLeft * dist, block.y + (fontSize / 2)];

        const dot = <circle r={5 / scaleFactor}
            cx={sx} cy={sy}
            fill="#808080"/> as Element;
        indentationInfo.appendChild(dot);

        if (block.kind === "division")
            continue;

        if (block.backwardLink !== undefined && !viewBlocks.includes(block.backwardLink)) {
            const path = <path d={`M${sx},${sy} V0`}
                stroke="#808080"
                stroke-width={1} /> as Element;
            indentationInfo.appendChild(path);
        }

        const connection = block.forwardLink === undefined
            ? block.height - (fontSize / 2)
            : (viewBlocks.includes(block.forwardLink)
               ? block.forwardLink.y - block.y
               : pageHeight - sy);

        if (connection < fontSize)
            continue;

        const path = <path d={`M${sx},${sy} v${connection}`}
            stroke="#808080"
            stroke-width={1} /> as Element;
        indentationInfo.appendChild(path);
    }

    return (
        <div class="full-page" id={`page${index}`}>
            { canvas }
            { linesLayer }
        </div>
    );
}

function createPageRenderer(mupdf: MupdfLib): PageRenderer {
    const renderedPageCache = new Map<PDFPage, OffscreenCanvas>();

    const pixelRatio = window.devicePixelRatio;
    const scaleFactor = 1.5;

    return {
        render(page) {
            let renderedPage = renderedPageCache.get(page);
            if (renderedPage !== undefined) {
                return renderedPage;
            }

            const pixmapScale = mupdf.Matrix.scale(scaleFactor * pixelRatio, scaleFactor * pixelRatio);
            const pixmap = page.toPixmap(pixmapScale, mupdf.ColorSpace.DeviceRGB, true, true)
            //  const pngImage = pixmap.asPNG() as Uint8Array;
            const pixels = pixmap.getPixels() as Uint8ClampedArray;

            //  renderedPage = URL.createObjectURL(new Blob([pngImage], { type: 'image/png' }));
            const width = pixmap.getWidth();
            const height = pixmap.getHeight();
            const imageData = new ImageData(pixels, width, height);

            renderedPage = new OffscreenCanvas(imageData.width, imageData.height);
            renderedPage 
                .getContext("2d")!
                .putImageData(imageData, 0, 0);
            renderedPageCache.set(page, renderedPage);

            return renderedPage;
        },
        scaleFactor,
    };

}

function* unpackViewBlocks(allPageInfo: PageInfo[]): Generator<ViewBlock, any, undefined> {
    for (const pageInfo of allPageInfo) {
        yield* pageInfo.viewBlocks;
    }
}

function getCue(block: ViewBlock): ViewBlock {
    if (block.kind === "cue" || block.backwardLink === undefined)
        return block;
    return getCue(block.backwardLink);
}

type DocumentInfo = {
    unknowns: ViewBlock[],
    divisions: ViewBlock[],
    allPageInfo: PageInfo[],
};

function computeDocumentInfo(
    rawPageInfoCache: Map<PDFPage, PageInfo>,
    allPages: PDFPage[],
    options: { header: number, footer: number }
): DocumentInfo {
    const allPageInfo =  allPages
        .map((page, idx) => {
            let info = rawPageInfoCache.get(page);
            if (info === undefined) {
                info = computePageInfo(page, idx);
                rawPageInfoCache.set(page, info);
            }
            info = window.structuredClone(info);
            return {
                ...info,
                viewBlocks: info.viewBlocks
                    .slice(0, info.viewBlocks.length - options.footer)
                    .slice(options.header)
            };
        });

    const divisions: ViewBlock[] = [];
    const unknowns: ViewBlock[] = [];

    let prevBlock: ViewBlock|undefined;
    for (const block of unpackViewBlocks(allPageInfo)) {
        if (block.kind === "division")
            divisions.push(block);
        if (block.kind === "unknown")
            unknowns.push(block);

        if (prevBlock === undefined) {
            prevBlock = block;
            continue
        }
        if (prevBlock.kind === "division") {
            prevBlock = block;
            continue;
        }
        if (block.kind === "info" && prevBlock.kind !== "unknown") {
            block.backwardLink = prevBlock;
            prevBlock.forwardLink = block;
        }
        if (block.kind === "cue" && prevBlock.kind !== "unknown") {
            const actor1 = block.text.match(actorsRegex)![0];
            const actor2 = getCue(prevBlock).text.match(actorsRegex)?.[0] ?? "";
            if (actor1 === actor2) {
                block.backwardLink = prevBlock;
                prevBlock.forwardLink = block;
            }
        }
        prevBlock = block;
    }

    return {
        unknowns,
        divisions,
        allPageInfo
    };
}

const allowedNumberKeys = new Set<string>([
    "Backspace", "Delete", "ArrowLeft", "ArrowRight",
    "ArrowUp", "ArrowDown", "Home", "End", "Tab", "Enter",
    "0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
    "Numpad0", "Numpad1", "Numpad2", "Numpad3", "Numpad4",
    "Numpad5", "Numpad6", "Numpad7", "Numpad8", "Numpad9",
]);

function betterParseInt(input: string): number|undefined {
    const num = Number(input);
    return Number.isInteger(num) ? num : undefined;
}

export function DocumentView(
    props: {
        mupdf: MupdfLib,
        pdfDoc: PDFDocument
    }
): JSX.Element {
    const [footer, setFooter] = createSignal(0);
    const [header, setHeader] = createSignal(0);

    const [signal, setSignal] = createSignal({});

    const { mupdf, pdfDoc } = props;
    const scrollingElement = document.querySelector('.routing-contents')!;

    const renderer = createPageRenderer(mupdf);

    const allPages = Array.from({ length: pdfDoc.countPages() })
        .map((_, idx) => pdfDoc.loadPage(idx))
        .slice(2);
    const rawPageInfoCache = new Map<PDFPage, PageInfo>();

    let divisions: ViewBlock[],
        unknowns: ViewBlock[],
        allPageInfo: PageInfo[];

    ({ divisions, unknowns, allPageInfo } = computeDocumentInfo(
        rawPageInfoCache,
        allPages, { header: header(), footer: footer() }));

    createEffect(() => {
        ({ divisions, unknowns, allPageInfo } = computeDocumentInfo(
            rawPageInfoCache,
            allPages, { header: header(), footer: footer() }));
        setSignal({});
    })

    function renderPage(page: PDFPage, index: number): JSX.Element {
        const { viewBlocks } = allPageInfo[index];

        return (
            <PageView
                renderer={renderer}
                index={index}
                page={page}
                viewBlocks={viewBlocks}/>
        );
    }

    const pages = createMemo(() => {
        signal();
        return allPages.map(renderPage);
    });

    const renderedWarnings = createMemo(() => {
        signal();
        const pageMap = new Map<number, number>();
        for (const unknown of unknowns) {
            let count = pageMap.get(unknown.page) ?? 0;
            count += 1;
            pageMap.set(unknown.page, count);
        }
        return Array.from(pageMap.entries())
            .map(
               ([page, count]) => 
                    <li data-page={page}>
                        <i class="bi bi-exclamation-triangle-fill" style={{color: 'orange'}}/> Seite {page + 1}: {pluralize(count, 'Warnung', 'Warnungen')}
                    </li>
            )
    })

    function gotoDivision(e: MouseEvent) {
        const source = e.target;
        if (!(source instanceof HTMLLIElement)) return;
        const page = Number(source.dataset.page);

        const element = document.getElementById(`page${page}`);
        if (element === null) return;

        scrollingElement.scrollTo({ top: element.offsetTop });
    }

    function ensureNumberInput(event: KeyboardEvent) {
        if (!allowedNumberKeys.has(event.key))
            event.preventDefault();
    }

    function validateUpdateInputChange(setter: Setter<number>): (e: InputEvent) => void {
        return event => {
            const input = event.target as HTMLInputElement;
            const newV = betterParseInt(input.value);
            setter(prevV => newV ?? prevV); 
        };
    }

    return (
        <div class="document-view">
            <div class="pages">
                { pages() }
            </div>
            <div>
                <div class="messages">
                    <h4>Einstellungen</h4>
                    <section class="settings">
                        <label>
                            Kopfzeile: 
                            <input class="counter"
                                type="text"
                                inputmode="numeric"
                                value="0"
                                size="3"
                                onKeyDown={ensureNumberInput}
                                onInput={validateUpdateInputChange(setHeader)}/>
                        </label>
                        <label>
                            Fußzeile: 
                            <input class="counter"
                                type="text"
                                inputmode="numeric"
                                value="0"
                                size="3"
                                onKeyDown={ensureNumberInput}
                                onInput={validateUpdateInputChange(setFooter)}/>
                        </label>
                    </section>
                    <h4>Abschnitte</h4>
                    <section class="divisions">
                        <ul onClick={gotoDivision}>
                            {
                                signal() && divisions
                                    .map(division => <li data-page={division.page}>{ division.text }</li>)
                            }
                        </ul>
                    </section>
                    <h4>Warnungen</h4>
                    <section class="warnings">
                        <ul onClick={gotoDivision}>
                            { renderedWarnings() }
                        </ul>
                    </section>
                </div>
            </div>
        </div>
    );
}


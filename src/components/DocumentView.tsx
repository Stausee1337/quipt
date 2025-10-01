import { Accessor, Component, JSX, Setter, batch, createEffect, createMemo, createRoot, createSignal, onCleanup, onMount, untrack } from "solid-js";
import { insert } from "solid-js/web";
import type { Font, PDFDocument, PDFPage, Rect, StructuredText } from "mupdf"
import { formatActorsArray, formatMarkdown, getActorColor, pluralize } from "./common";
import Popper, { createPopper } from "@popperjs/core"
import * as b from "../backend";
import { DialogManager } from "../dialog";
import { TextCueView } from "./TextCueView";
import { DivisionInfoView } from "./DivisionInfoView";

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

type ViewBlockKind = "cue"|"division"|"info"|"connected"|"unknown";

type ViewBlock = {
    x: number,
    y: number,
    width: number,
    height: number,

    page: number,
    text: string,
    kind: ViewBlockKind,
    fontStyleSpans: FontStyleSpan[],
    children?: ViewBlock[],
    knownDivision?: ViewBlock|null,
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

function connected(block: ViewBlock): boolean {
    return block.forwardLink !== undefined || block.backwardLink !== undefined;
}

function ViewBlockMenu(
    { viewBlock, pageContext }: {
        viewBlock: ViewBlock,
        pageContext: PageContext
    }
): JSX.Element {
    function ignore(what: "this"|"all" = "this") {
        if (what === "this") {
            const allBlocks = pageContext.getViewBlocks(viewBlock.page);
            const index = allBlocks.indexOf(viewBlock);
            allBlocks.splice(index, 1);
            pageContext.invalidatePage(viewBlock.page);
        } else {
            for (let i = 0; i < pageContext.numPages; i++) {
                const blocks = pageContext.getViewBlocks(i);
                const ignoredBlocks = blocks.filter(block => block.text.trim() === viewBlock.text.trim())
                for (const ignoredBlock of ignoredBlocks) {
                    const index = blocks.indexOf(ignoredBlock);
                    blocks.splice(index, 1);
                }
            }
            pageContext.invalidatePage();
        }
    }

    function connect(where: "upward"|"downward") {
        const blocks = pageContext.getViewBlocks(viewBlock.page);
        const index = blocks.indexOf(viewBlock);

        if (where === "upward" && viewBlock.backwardLink === undefined && viewBlock.page >= 1) {
            const previousBlock = index > 0
                ? blocks[index - 1]
                : pageContext.getViewBlocks(viewBlock.page - 1).at(-1)!;
            previousBlock.forwardLink = viewBlock;
            viewBlock.backwardLink = previousBlock;
            if (viewBlock.kind === "unknown")
                viewBlock.kind = "connected";
            if (previousBlock.kind === "unknown")
                previousBlock.kind = "connected";
            pageContext.invalidatePage(viewBlock.page - 1);
        } else if (where === "downward" && viewBlock.forwardLink === undefined && viewBlock.page < pageContext.numPages - 1) {
            const nextBlock = index < blocks.length - 1 
                ?  blocks[index + 1]
                : pageContext.getViewBlocks(viewBlock.page + 1)[0];
            nextBlock.backwardLink = viewBlock;
            viewBlock.forwardLink = nextBlock;
            if (viewBlock.kind === "unknown")
                viewBlock.kind = "connected";
            if (nextBlock.kind === "unknown")
                nextBlock.kind = "connected";
            pageContext.invalidatePage(viewBlock.page + 1);
        }
        pageContext.invalidatePage(viewBlock.page);
    }

    function disconnect(where: "upward"|"downward") {
        if (where === "upward" && viewBlock.backwardLink !== undefined) {
            const previousBlock = viewBlock.backwardLink;
            previousBlock.forwardLink = undefined;
            viewBlock.backwardLink = undefined;
            if (viewBlock.kind === "connected" && !connected(viewBlock))
                viewBlock.kind = "unknown"
            if (previousBlock.kind === "connected" && !connected(previousBlock))
                previousBlock.kind = "unknown"
            pageContext.invalidatePage(viewBlock.page - 1);
        } else if (where === "downward" && viewBlock.forwardLink !== undefined) {
            const nextBlock = viewBlock.forwardLink;
            nextBlock.backwardLink = undefined;
            viewBlock.forwardLink = undefined;
            if (viewBlock.kind === "connected" && !connected(viewBlock))
                viewBlock.kind = "unknown"
            if (nextBlock.kind === "connected" && !connected(nextBlock))
                nextBlock.kind = "unknown"
            pageContext.invalidatePage(viewBlock.page + 1);
        }
        pageContext.invalidatePage(viewBlock.page);
    }

    const renderedOptions = createMemo(() => {
        if (viewBlock.kind === "unknown") {
            return (
                <>
                    <li onClick={() => ignore()}>Ignorieren</li>
                    <li onClick={() => ignore('all')}>Alle ignorieren</li>
                    
                </>
            );
        } else if (viewBlock.kind === "division") {
            return (
                <li onClick={() => ignore()}>Kein Abschnitt</li>
            )
        }
        return <></>
    })

    return (
        <ul class="menu-options">
            { renderedOptions() }
            {
                viewBlock.kind === "division" ? null :
                    <>
                    {
                        viewBlock.backwardLink === undefined
                            ? <li onClick={() => connect('upward')}>Mit oberem verbinden</li>
                            : <li onClick={() => disconnect('upward')}>Von oberem lösen</li>
                    }
                    {
                        viewBlock.forwardLink === undefined
                            ? <li onClick={() => connect('downward')}>Mit unterem verbinden</li>
                            : <li onClick={() => disconnect('downward')}>Von unterem lösen</li>
                    }
                    </>
            }
        </ul>
    );
}

function DistributionDialog(
    props: {
        closer: (res: string[]|undefined) => void,
        actors: Map<string, number>,
        target: string,
    }
): JSX.Element {
    const [selected, setSelected] = createSignal<string[]>([]);

    function toggleSelection(event: MouseEvent & { currentTarget: HTMLSpanElement }) {
        const target = event.currentTarget;
        const isSelected = target.classList.toggle('selected');
        const currentActor = target.dataset.actor!;
        setSelected(prev => [
            ...(isSelected ? prev : prev.filter(x => x !== currentActor)),
            ...(isSelected ? [currentActor] : [])
        ])
    }

    function commit() {
        const result = selected();
        if (result.length === 0)
            props.closer(undefined);
        else
            props.closer(result);
    }

    return (
        <>
            <button class="close" onClick={() => props.closer(undefined)}>
                <i class="bi bi-x"/>
            </button>
            <h2 class="disolve-and-distribute">
                Auflösen und Verteilen von
                <span 
                    style={{'--actor-color': getActorColor(props.target)}}
                    class="actor-pill static">
                    { props.target }
                 </span>
            </h2>
            <div class="actors-selection">
                {
                    Array.from(props.actors.keys())
                        .filter(actor => actor !== props.target)
                        .map(actor => 
                             <span class="actor-pill"
                                onClick={toggleSelection} 
                                data-actor={actor}
                                style={{'--actor-color': getActorColor(actor)}}>
                                { actor }
                             </span>)
                }
            </div>
            <div class="bottom-line">
                <button class="primary-button"
                    onClick={commit}
                    disabled={selected().length === 0}>
                    Bestätigen
                </button>
            </div>
        </>
    );
}

function ActorMenu(
    { actor, actorsContext }: {
        actor: string,
        actorsContext: ActorsContext
    }
): JSX.Element {

    async function openDistributionDialog() {
        const distributeTo = await DialogManager.openDialog<string[]>(
            ({ closer }) => <DistributionDialog 
                closer={closer}
                actors={actorsContext.actors}
                target={actor}/>
        );
        if (distributeTo === undefined)
            return;
        actorsContext.replace(actor, distributeTo);
    }

    return (
        <ul class="menu-options">
            <li onClick={() => actorsContext.delete(actor)}>Löschen</li>
            <li onClick={openDistributionDialog}>Auflösen und Verteilen</li>
        </ul>
    );
}

function handleContextMenu<P extends Record<string, any>>(
    event: ContextMenuEvent,
    placement: Popper.Placement,
    Component: Component<P>,
    props: P
) {
    const reference = event.reference;

    const target = event.target as HTMLElement;
    if (target.classList.contains('menu-open'))
        return;
    target.classList.add('menu-open');

    createRoot(dispose => {
        const popoverMenu =
            <div class="popover-menu" onClick={transactionClick}>
                <Component {...props}/>
            </div> as HTMLDivElement;

        function transactionClick(event: MouseEvent) {
            if (event.target instanceof HTMLLIElement)
                dispose();
        }

        function captureClick(event: MouseEvent) {
            const path = event.composedPath();
            if (!(path.includes(reference) || path.includes(popoverMenu)))
                dispose();
        }

        let popper: Popper.Instance|undefined;
        onMount(() => {
            popper = createPopper(
                reference,
                popoverMenu,
                { placement }
            )
            document.documentElement.addEventListener('click', captureClick);
            target.addEventListener('еееContextMenu', dispose);
        })

        onCleanup(() => {
            if (popper === undefined) return;
            document.documentElement.removeEventListener('click', captureClick);

            target.classList.remove('menu-open');
            target.removeEventListener('еееContextMenu', dispose);
            popper.destroy();
            popoverMenu.remove();
        })

        insert(document.body, popoverMenu);
    });

}

function installContextMenuHandler<P extends Record<string, any>>(
    target: HTMLElement,
    placement: Popper.Placement,
    Component: Component<P>,
    props: P
) {
    target.addEventListener(
        'еееContextMenu',
        event => handleContextMenu(event, placement, Component, props)
    );

}

const pageMarginLeft = 45;
const fontSize = 13;

const ONE_THIRD = 1/3;
const TWO_THIRDS = 2/3;

interface PageRenderer {
    render(page: PDFPage): OffscreenCanvas;
    readonly scaleFactor: number;
}

class ContextMenuEvent extends Event  {
    constructor(public reference: HTMLElement) {
        super('еееContextMenu');
    } 
}

function PageView(
    props: {
        context: PageContext,
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
        style={{
            width: `${Math.floor(pageWidth * scaleFactor)}px`,
            height: `${Math.floor(pageHeight * scaleFactor)}px`}}/> as HTMLCanvasElement;
    let imageLoaded = false;

    const observer = new IntersectionObserver(entries => {
        if (imageLoaded) return;
        if (!entries[0].isIntersecting) return;

        const ctx = canvas.getContext("2d")!;
        const imageCanvas = renderer.render(page);
        const dpr = window.devicePixelRatio;

        canvas.width = pageWidth * scaleFactor * dpr;
        canvas.height = pageHeight * scaleFactor * dpr;

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

    // let currentSpan: HTMLSpanElement|undefined;
    // function trackMenuIcon(event: MouseEvent) {
    //     const target = event.target;
    //     if (!(target instanceof HTMLSpanElement))
    //         return;
    //     currentSpan = target;
    //     const top = target.offsetTop;
    //     const height = target.offsetHeight;
    //     linesLayer.style.setProperty('--icon-offset', `${top + height/2}px`);
    // }

    function onOpenMenu(event: MouseEvent) {
        const target = event.target as HTMLElement;
        const parent = target.parentElement!;
        const toggleMenu = new ContextMenuEvent(target);
        parent.dispatchEvent(toggleMenu);
    }

    const linesLayer = <div class="lines-layer" 
        style={{
            width: `${pageWidth * scaleFactor}px`,
            height: `${pageHeight * scaleFactor}px`,
        }}>
        </div> as HTMLDivElement;

    const indentationInfo = <svg xmlns="http://www.w3.org/2000/svg"
        height="100%"
        width={`${(pageMarginLeft / pageWidth) * 100}%`}
        viewBox={`0 0 ${pageMarginLeft} ${pageHeight}`}
        fill="none"/> as SVGSVGElement;

    linesLayer.appendChild(indentationInfo);

    let currentDivision: ViewBlock|null|undefined;
    for (const block of viewBlocks) {
        const visualBlock = <span style={{
                top: `${(block.y / pageHeight) * 100}%`,
                height: `${(block.height / pageHeight) * 100}%`,
                width: `${(block.width / pageWidth) * 100}%`,
            }} 
            classList={{[block.kind]: true}}
            data-text-content={block.text}>
                <i class="menu-icon" onClick={onOpenMenu}>&#xF5D3;</i>
            </span> as HTMLSpanElement;

        installContextMenuHandler(
            visualBlock,
            'bottom-start',
            ViewBlockMenu,
            {
                viewBlock: block,
                pageContext: props.context
            }
        );
        linesLayer.appendChild(visualBlock);
        if (currentDivision === undefined && block.knownDivision !== undefined) {
            currentDivision = block.knownDivision;
            if (currentDivision !== null &&
                    !viewBlocks.includes(currentDivision) &&
                    currentDivision.children !== undefined &&
                    currentDivision.children.length > 0) {

                const lastChild = currentDivision.children.at(-1)!;
                const connection = viewBlocks.includes(lastChild)
                    ? lastChild.y + (Math.max(0, Math.sign(lastChild.height - (fontSize / 2))) * lastChild.height)
                    : pageHeight;

                const path = <path d={`M${pageMarginLeft * ONE_THIRD},${0} v${connection}`}
                    stroke-width="1"
                    stroke="#808080"
                    shape-rendering="crispEdges"
                    vector-effect="non-scaling-stroke"/> as Element;
                indentationInfo.appendChild(path);

            }
        }

        if (block.kind === "unknown")
            continue;
        const dist = block.kind === "division" ? ONE_THIRD : TWO_THIRDS ;

        const [sx, sy] = [pageMarginLeft * dist, block.y + (fontSize / 2)];

        const dot = <circle r={2.5}
            vector-effect="non-scaling-size"
            cx={Math.ceil(sx)} cy={sy}
            fill="#808080"/> as Element;
        indentationInfo.appendChild(dot);

        if (block.kind === "division") {
            currentDivision = block;
            const children = block.children;
            if (children === undefined || children.length === 0)
                continue;
            const lastChild = children.at(-1)!;
            const connection = viewBlocks.includes(lastChild)
                ? (lastChild.y - sy) + (Math.max(0, Math.sign(lastChild.height - (fontSize / 2))) * lastChild.height - (fontSize / 2))
                : pageHeight - sy;

            const path = <path d={`M${sx},${sy} v${connection}`}
                stroke-width="1"
                stroke="#808080"
                shape-rendering="crispEdges"
                vector-effect="non-scaling-stroke"/> as Element;
            indentationInfo.appendChild(path);
            continue;
        }

        if (block.backwardLink !== undefined && !viewBlocks.includes(block.backwardLink)) {
            const path = <path d={`M${sx},${sy} V0`}
                stroke="#808080"
                stroke-width={1}
                shape-rendering="crispEdges"
                vector-effect="non-scaling-stroke"/> as Element;
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
            stroke-width="1"
            stroke="#808080"
            shape-rendering="crispEdges"
            vector-effect="non-scaling-stroke"/> as Element;
        indentationInfo.appendChild(path);
    }

    return (
        <div class="full-page" id={`page${index}`} data-page={index}>
            { canvas }
            { linesLayer }
        </div>
    );
}

declare global {
interface HTMLElementEventMap {
    'еееContextMenu': ContextMenuEvent
}
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

function analyzePagesWithOptions(
    rawPageInfoCache: Map<PDFPage, PageInfo>,
    allPages: PDFPage[],
    options: { header: number, footer: number }
): PageInfo[] {
    return allPages
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
}

function populateDocumentInfo(
    allPageInfo: PageInfo[],
    divisions: ViewBlock[],
    unknowns: ViewBlock[],
    actors: Map<string, number>
) {
    divisions.length = 0;
    unknowns.length = 0;
    actors.clear();

    let prevBlock: ViewBlock|undefined;
    let currentDivision: ViewBlock|null = null;
    for (const block of unpackViewBlocks(allPageInfo)) {
        if (block.kind === "unknown")
            unknowns.push(block);
        else if (block.kind === "division") {
            divisions.push(block);
            currentDivision = block;
            block.children = [];
        } else {
            block.knownDivision = currentDivision;
            currentDivision?.children!.push(block);
        }

        if (prevBlock === undefined) {
            prevBlock = block;
            continue
        }
        if (prevBlock.kind === "division") {
            prevBlock = block;
            continue;
        }
        if (block.kind === "cue") {
            const actor = block.text.match(actorsRegex)![0].trim();
            const cues = actors.get(actor) ?? 0;
            actors.set(actor, cues + 1);
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
}

function buildConnectedMarkdown(block: ViewBlock): string {
    let start: ViewBlock = block;
    while (start.backwardLink !== undefined)
        start = start.backwardLink;

    let current: ViewBlock|undefined = start;
    const markdownContent: string[] = [];
    while (current !== undefined) {
        let content; 
        if (current.kind === "cue" && block.text.match(actorsRegex) !== null) {
            content = buildMarkdown({
                text: current.text,
                fontStyleSpans: current.fontStyleSpans.slice(1) 
            });
        } else {
            content = buildMarkdown(current)
        }
        markdownContent.push(content);
        current = current.forwardLink;
    }

    return markdownContent.join('\n');
}

type Division = {
    name?: string,
    description?: string,
    textCues: b.TextCue[]
};

function buildSemiQuiptCueData(
    allPageInfo: PageInfo[],
    actorsMap: Map<string, number>,
    actorsMapping: Map<string, string[]>,
): Division[] {
    const divisions: Division[] = [];

    let prevBlock: ViewBlock|undefined;
    let currentDivision: Division = {
        textCues: []
    };

    for (const block of unpackViewBlocks(allPageInfo)) {
        switch (block.kind) {
            case "division":
            {
                if (currentDivision.textCues.length > 0)
                    divisions.push(currentDivision);
                currentDivision = {
                    name: block.text,
                    textCues: []
                };
            }
            break;
            case "info":
            {
                if (prevBlock?.kind === "division")
                    currentDivision.description = buildConnectedMarkdown(block);
            }
            break;
            case "cue":
            {
                const actor = block.text.match(actorsRegex)![0].trim();

                if (block.backwardLink !== undefined) {
                    const actor2 = getCue(block.backwardLink).text.match(actorsRegex)?.[0].trim() ?? "";
                    if (actor === actor2)
                        continue
                }

                let actors: string[];
                if (actorsMap.has(actor))
                    actors = [actor];
                else {
                    const mappedActors = actorsMapping.get(actor);
                    if (mappedActors === undefined)
                        throw 'unexpected undefined actors mapping';
                    if (mappedActors.length === 0) {
                        // this is not a cue since its actor was deleted
                        prevBlock = block;
                        continue;
                    }
                    actors = mappedActors; 
                }

                currentDivision.textCues.push({
                    actors,
                    text: buildConnectedMarkdown(block)
                })
            }
            break;
            default:
                continue;
        }
        prevBlock = block;
    }

    if (currentDivision.textCues.length > 0)
        divisions.push(currentDivision);
    return divisions;
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

function createInvalidatable<T>(fn: Accessor<T>): [Accessor<T>, () => void] {
    const [pullSignal, setSignal] = createSignal({});

    const read = createMemo(() => {
        pullSignal();
        return untrack(fn);
    });

    return [read, () => setSignal({})];
}

interface PageContext {
    readonly numPages: number;
    invalidatePage(index?: number): void;
    getViewBlocks(page: number): ViewBlock[];
}

function toggleMenu(event: MouseEvent & { currentTarget: HTMLElement }) {
    const target = event.currentTarget;
    const toggleMenu = new ContextMenuEvent(/* reference */ target);
    target.dispatchEvent(toggleMenu);
}

interface ActorsContext {
    delete(actor: string): void;
    replace(actor: string, replacee: string[]): void;
    readonly actors: Map<string, number>;
}

function createActorsContext(
    actors: Map<string, number>,
    actorsMapping: Map<string, string[]>,
    invalidateRender: () => void
): [ActorsContext, (hard?: boolean) => void] {
    updateMapping();

    function updateMapping(hard: boolean = false) {
        if (hard) {
            actorsMapping.clear();
            return;
        }
        for (const [fromActor, toMapping] of actorsMapping) {
            const count = actors.get(fromActor);
            if (count === undefined) {
                continue;
            }
            for (const toActor of toMapping) {
                const origCount = actors.get(toActor) ?? 0;
                actors.set(toActor, origCount + count);
            }
            actors.delete(fromActor);
        }
    }

    const ctx: ActorsContext = {
        delete(actor) {
            actors.delete(actor);
            actorsMapping.set(actor, []);
            invalidateRender();
        },
        replace(actor, replacee) {
            const count = actors.get(actor) ?? 0;
            actorsMapping.set(actor, replacee);
            for (const toActor of replacee) {
                const origCount = actors.get(toActor) ?? 0;
                actors.set(toActor, origCount + count);
            } 
            actors.delete(actor);
            invalidateRender();
        },
        get actors() {
            return actors;
        }
    };
    return [ctx, updateMapping];
}

function FinalizeScriptView(
    props: {
        actorsMap: Map<string, number>,
        semiDivisions: Division[]
    }
) {
    const actors = Array.from(props.actorsMap.keys());
    const [currentActor, setCurrentActor] = createSignal<string>(actors[0]);
    const [currentIdx, setCurrentIdx] = createSignal(0);

    let headerElement: HTMLDivElement;
    let divisionsElement: HTMLUListElement;
    let scrollingElement: HTMLElement;
    let contentElement: HTMLDivElement;

    onMount(() => {
        scrollingElement = document.getElementById('dialog-box')!
        divisionsElement.style.top = `${divisionsElement.offsetTop}px`;
    })

    function onScroll() {
        const rect = scrollingElement.getBoundingClientRect();
        const element = document.elementFromPoint(
            rect.left + contentElement.offsetWidth / 2,
            rect.top + headerElement.offsetHeight + 10
        );

        let currentElement: Element|null = element;
        while (currentElement !== null) {
            if (currentElement.classList.contains('script-divsion')
                    && (currentElement instanceof HTMLElement)) {
                const divisionIdx = Number(currentElement.dataset.division)
                setCurrentIdx(divisionIdx);
                break;
            }

            currentElement = currentElement.parentElement;
        }
    }

    onMount(() => {
        scrollingElement.addEventListener('scroll', onScroll);
    })

    onCleanup(() => {
        scrollingElement.removeEventListener('scroll', onScroll);
    })

    function renderCue(textCue: Readonly<b.TextCue> | null, type: "request"|"response"): JSX.Element {
        const cueData = type === "request" 
            ? { actors: formatActorsArray(textCue?.actors ?? null), text: textCue?.text ?? "Du bist der erste in diesem Abschnitt" }
            : { actors: formatActorsArray(textCue!.actors.length === 1 ? null : textCue!.actors), text: textCue!.text! };
        return (
            <TextCueView
                last={false}
                type={type}
                text={formatMarkdown(cueData.text)}
                actorsInfo={cueData.actors}/>);
    }

    function renderCuePair(textCuePair: Readonly<b.TextCuePair>): JSX.Element {
        return (
            <>
                { renderCue(textCuePair.request, "request") }
                { renderCue(textCuePair.response, "response") }
            </>
        );
    }

    const activeDivisions = createMemo(() => {
        const selfActor = currentActor();
        const result: b.Division[] = []
        for (const semiDivision of props.semiDivisions) {
            const division: b.Division = {
                name: semiDivision.name ?? "",
                description: semiDivision.description ?? "",
                previousTotals: [],
                textCues: []
            };

            let lastCue: b.TextCue|null = null;
            for (const textCue of semiDivision.textCues) {
                if (!textCue.actors.includes(selfActor)) {
                    lastCue = textCue;
                    continue;
                }
                division.textCues.push({
                    request: lastCue,
                    response: textCue,
                    previousScores: []
                });
            }
            if (division.textCues.length > 0)
                result.push(division);
        }
        return result;
    })

    function jumpToDivision(event: MouseEvent & { currentTarget: HTMLSpanElement }) {
        const target = event.currentTarget;
        const divisionIdx = Number(target.dataset.idx);
        const element = document.getElementById(`division${divisionIdx}`)!;
        scrollingElement.scrollTo({ top: element.offsetTop - headerElement.offsetHeight });
    }

    return (
        <div class="script-finalization-view">
            <div ref={headerElement} class="actors-selection">
                {
                    actors.map((actor) =>
                        <span class="actor-pill" 
                            onClick={() => setCurrentActor(actor)}
                            classList={{ selected: currentActor() === actor }}
                            style={{'--actor-color': getActorColor(actor)}}>
                            { actor } ({props.actorsMap.get(actor)})
                        </span> as HTMLSpanElement
                    )
                }
            </div>
            <div ref={contentElement} class="script-content">
                {
                    activeDivisions()
                        .map((division, idx) => {
                            return (
                                <div class="script-divsion" id={`division${idx}`} data-division={idx}>
                                    <h2>{ division.name }</h2>
                                    <DivisionInfoView division={division}/>
                                    { division.textCues.map(renderCuePair) }
                                </div>
                            );
                        })
                }
            </div>
            <div class="aux-info">
                <ul ref={divisionsElement} class="divisions">
                    {
                        activeDivisions()
                            .map((division, idx) =>
                                <li 
                                    classList={{ current: currentIdx() === idx }}
                                    onClick={jumpToDivision}
                                    data-idx={idx}>
                                    { division.name }
                                </li>)
                    }
                </ul>
            </div>
            <div class="bottom-line">
                <button class="secondary-button">Abbrechen</button>
                <button class="primary-button">Speichern</button>
            </div>
        </div>
    );
}

export function DocumentView(
    props: {
        mupdf: MupdfLib,
        pdfDoc: PDFDocument,
        name: string,
        deletedPages: Set<number>
    }
): JSX.Element {
    const [footer, setFooter] = createSignal(0);
    const [header, setHeader] = createSignal(0);
    const [currentPage, setCurrentPage] = createSignal(1);

    const [signal, setSignal] = createSignal<any>({});

    const { mupdf, pdfDoc, deletedPages } = props;
    const scrollingElement = document.querySelector('.routing-contents')! as HTMLDivElement;

    const renderer = createPageRenderer(mupdf);

    const allPages = Array.from({ length: pdfDoc.countPages() })
        .map((_, idx) => pdfDoc.loadPage(idx))
        .filter(page => !deletedPages.has(page.pointer));
    const rawPageInfoCache = new Map<PDFPage, PageInfo>();

    const pageContext: PageContext = {
        numPages: allPages.length,
        invalidatePage(index) {
            rebuildDocumentInfo();
            if (index === undefined) {
                batch(() => {
                    for (let i = 0; i < allPages.length; i++) {
                        const [_, invalidate] = pageInvalidatables[i];
                        invalidate();
                    }
                })
            } else {
                const [_, invalidate] = pageInvalidatables[index];
                invalidate();
            }
        },
        getViewBlocks(page) {
            return pageInfos()[page].viewBlocks;
        },
    };

    function onScroll() {
        const rect = scrollingElement.getBoundingClientRect();
        const element = document.elementFromPoint(
            rect.left + rect.width / 2,
            rect.top + rect.height - 10
        );

        let currentElement: Element|null = element;
        while (currentElement !== null) {
            if (currentElement.classList.contains('full-page')
                    && (currentElement instanceof HTMLElement)) {
                setCurrentPage(Number(currentElement.dataset.page) + 1);
                break;
            }

            currentElement = currentElement.parentElement;
        }
    }

    onMount(() => {
        scrollingElement.addEventListener('scroll', onScroll);
    })

    onCleanup(() => {
        scrollingElement.removeEventListener('scroll', onScroll);
    })

    const actors = new Map<string, number>()
    const actorsMapping = new Map<string, string[]>();
    const [actorsContext, updateActorsMapping] = createActorsContext(actors, actorsMapping, () => setSignal({}));

    const pageInfos = createMemo(() => {
        const pageInfos = analyzePagesWithOptions(
            rawPageInfoCache,
            allPages,
            { header: header(), footer: footer() });
        updateActorsMapping(/* hard */ true);

        return pageInfos;
    });

    const divisions: ViewBlock[] = [],
        unknowns: ViewBlock[] = [];

    createEffect(() => {
        pageInfos();
        pageContext.invalidatePage();
    })

    function rebuildDocumentInfo(firstTime: boolean = false) {
        populateDocumentInfo(pageInfos(), divisions, unknowns, actors);
        updateActorsMapping();
        if (firstTime) return;
        setSignal({});
    }
    rebuildDocumentInfo(true);

    const pageInvalidatables =
            allPages.map((page, index) => createInvalidatable(() => renderPage(page, index)));

    function renderPage(page: PDFPage, index: number): JSX.Element {
        const { viewBlocks } = pageInfos()[index];

        return (
            <PageView
                context={pageContext}
                renderer={renderer}
                index={index}
                page={page}
                viewBlocks={viewBlocks}/>
        );
    }

    const pages = createMemo(() => {
        return pageInvalidatables
            .map(([page]) => page())
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

    function renderActor([actor, count]: [string, number]) {
        let actorPill =
            <span 
                onClick={toggleMenu}
                style={{'--actor-color': getActorColor(actor)}}
                class="actor-pill">
                { actor } ({count})
            </span> as HTMLSpanElement;
        installContextMenuHandler(
            actorPill,
            'top',
            ActorMenu,
            { actor, actorsContext }
        );
        return actorPill;
    }

    function commmitScript() {
        const semiDivisions = buildSemiQuiptCueData(pageInfos(), actors, actorsMapping);
        DialogManager.openDialog(
            () => <FinalizeScriptView
                actorsMap={actors}
                semiDivisions={semiDivisions}/>
        );
    }

    return (
        <div class="document-view">
            <div class="header-info">
                <div class="content">
                    <span>{ currentPage() } / { allPages.length }</span>
                    <span class="seperator"/>
                    <i class="bi bi-database-fill-up" onClick={commmitScript}/>
                </div>
                <div style={{ width: '40rem' }}/>
            </div>
            <div class="pages">
                { pages() }
            </div>
            <div style={{'margin-right': '1rem'}}>
                <div class="messages">
                    <h4>Einstellungen</h4>
                    <section class="settings">
                        <label>
                            Kopfzeile: 
                            <input class="small-input"
                                type="text"
                                inputmode="numeric"
                                value="0"
                                size="3"
                                onKeyDown={ensureNumberInput}
                                onInput={validateUpdateInputChange(setHeader)}/>
                        </label>
                        <label>
                            Fußzeile: 
                            <input class="small-input"
                                type="text"
                                inputmode="numeric"
                                value="0"
                                size="3"
                                onKeyDown={ensureNumberInput}
                                onInput={validateUpdateInputChange(setFooter)}/>
                        </label>
                    </section>
                    <h4>Charaktere</h4>
                    <section class="actors">
                        {
                            signal().x ?? Array.from(actors).map(renderActor)
                        }
                        
                    </section>
                    <h4>Abschnitte</h4>
                    <section class="divisions">
                        <ul onClick={gotoDivision}>
                            {
                                signal().x ?? divisions
                                    .map(division => <li data-page={division.page}>{ division.text }</li>)
                            }
                        </ul>
                    </section>
                    {
                        (signal().x ?? unknowns.length) === 0 ? null
                            :<>
                                <h4>Warnungen ({ signal().x ?? unknowns.length })</h4>
                                <section class="warnings">
                                    <ul onClick={gotoDivision}>
                                        { renderedWarnings() }
                                    </ul>
                                </section>
                            </>
                    }
                </div>
            </div>
        </div>
    );
}


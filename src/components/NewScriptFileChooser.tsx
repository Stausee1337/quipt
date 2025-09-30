import { Component, JSX, Owner, createContext, createEffect, createMemo, createRoot, createSignal, getOwner, onCleanup, onMount, useContext } from "solid-js";
import Popper, { createPopper } from "@popperjs/core"
import { Document as MupdfDocument, PDFDocument, Rect } from "mupdf";
import { insert } from "solid-js/web";
import { useNavigate } from "@solidjs/router";

type MupdfLib = typeof import("mupdf");

export class StateScriptTransferObject {
    private static objectMap = new Map<PDFDocument, StateScriptTransferObject>();

    constructor(
        public mupdf: MupdfLib,
        public document: PDFDocument,
        public name: string,
        public deletedPages: Set<number>
    ) {}

    static create(
        mupdf: MupdfLib, document: PDFDocument,
        name: string, deletedPages: Set<number>
    ): StateScriptTransferObject { 
        const transferObject = new StateScriptTransferObject(mupdf, document, name, deletedPages);
        StateScriptTransferObject.objectMap.set(document, transferObject);
        return transferObject;
    }

    static retreive(key: unknown): StateScriptTransferObject|undefined { 
        return StateScriptTransferObject.objectMap.get(key as any);
    }
}

function UploadIcon(): JSX.Element {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" fill="currentColor" class="bi bi-cloud-upload-fill" viewBox="0 0 16 16">
            <path fill-rule="evenodd" d="M8 0a5.53 5.53 0 0 0-3.594 1.342c-.766.66-1.321 1.52-1.464 2.383C1.266 4.095 0 5.555 0 7.318 0 9.366 1.708 11 3.781 11H7.5V5.707L5.354 7.854a.5.5 0 1 1-.708-.708l3-3a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 5.707V11h4.188C14.502 11 16 9.57 16 7.773c0-1.636-1.242-2.969-2.834-3.194C12.923 1.999 10.69 0 8 0m-.5 14.5V11h1v3.5a.5.5 0 0 1-1 0"/>
        </svg>
    );
}

function toDimensions(rect: Rect): [number, number] {
    const [ulx, uly, lrx, lry] = rect;
    const width = lrx - ulx;
    const height = lry - uly;
    return [width, height];
}


type RequireAtLeastOne<T, Keys extends keyof T = keyof T> =
  Keys extends keyof T
    ? Required<Pick<T, Keys>> & Omit<T, Keys>
    : never;

// Usage:
type Size = number | RequireAtLeastOne<{ width?: number; height?: number }, "width" | "height">;

interface PageContext {
    renderAtSize(pageIndex: number, size: Size): [number, number, string];
}

function createPageRenderer(mupdf: MupdfLib, doc: PDFDocument): PageContext {
    const pixelRatio = window.devicePixelRatio;
    const pageCache = new Map<string, [number, number, string]>();

    function buildScaleFactorFromSize([width, height]: [number, number], size: Size): [number, number] {
        if (typeof size === "number") {
            const scaleFactor = size / Math.max(width, height);
            return [scaleFactor, scaleFactor];
        }
        const scaleFactorX = size.width ? size.width / width : undefined;
        const scaleFactorY = size.height ? size.height / height : undefined;
        return [scaleFactorX ?? scaleFactorY!, scaleFactorY ?? scaleFactorX!];
    }

    return {
        renderAtSize(pageIndex, size) {
            let renderResult = pageCache.get(JSON.stringify([pageIndex, size]));
            if (renderResult !== undefined)
                return renderResult;

            const page = doc.loadPage(pageIndex);

            const dimensions = toDimensions(page.getBounds());
            const [width, height] = dimensions;
            const [scaleFactorX, scaleFactorY] = buildScaleFactorFromSize(dimensions, size);

            const pixmapScale = mupdf.Matrix.scale(scaleFactorX * pixelRatio, scaleFactorY * pixelRatio);
            const pixmap = page.toPixmap(pixmapScale, mupdf.ColorSpace.DeviceRGB);

            const pngImage = pixmap.asPNG() as Uint8Array;
            renderResult = [
                width * scaleFactorX,
                height * scaleFactorX,
                URL.createObjectURL(new Blob([pngImage], { type: 'image/png' }))
            ];
            pageCache.set(JSON.stringify([pageIndex, size]), renderResult);

            return renderResult;
        },
    };
}

const PageContextObj = createContext<PageContext>();

function mouseEnter(this: Owner, event: MouseEvent & { currentTarget: HTMLSpanElement }) {
    const reference = event.currentTarget;

    createRoot(dispose => {
        const pageContext = useContext(PageContextObj)!;
        
        const height = reference.getBoundingClientRect().top - 25;
        const img = <img/> as HTMLImageElement;
        [img.width, img.height, img.src] = pageContext.renderAtSize(Number(reference.dataset.page), { height });

        const popoverMenu =
            <div class="zoomed-in-page">
                { img }
                <div id="arrow" data-popper-arrow></div>
            </div> as HTMLDivElement;

        let popper: Popper.Instance|undefined;
        onMount(() => {
            popper = createPopper(
                reference,
                popoverMenu,
                { placement: 'top' }
            )
            reference.addEventListener('mouseleave', dispose);
            reference.addEventListener('еееRemoveThumbnail', dispose);
            img.onload = popper.forceUpdate;
        })

        onCleanup(() => {
            if (popper === undefined) return;
            reference.removeEventListener('mouseleave', dispose);
            reference.removeEventListener('еееRemoveThumbnail', dispose);
            popper.destroy();
            popoverMenu.remove();
        })

        insert(document.body, popoverMenu);
    }, this);
}

function filenameToName(filename: string): string {
  return filename
    .replace(/\.[^/.]+$/, "")
    // 2. Replace underscores and hyphens with spaces
    .replace(/[-_]+/g, " ")
    // 3. Remove extra spaces
    .replace(/\s+/g, " ")
    .trim()
}

const thumbnailMaxDimension = 128;
function PDFPageSelector(
    props: {
        filename: string,
        mupdf: MupdfLib,
        doc: PDFDocument
        routeTo: (comp: CBRComponent) => void,
        closer: () => void
    }
): JSX.Element {
    const { filename, doc, mupdf } = props;
    const navigate = useNavigate();
    const [isScrollable, setIsScrollable] = createSignal(false);
    const [canScrollLeft, setCanScrollLeft] = createSignal(false);
    const [canScrollRight, setCanScrollRight] = createSignal(false);

    const owner = getOwner()!;
    const pageContext = createPageRenderer(mupdf, doc);
    owner.context = { ...owner.context, [PageContextObj.id]: pageContext };

    const images = Array.from({ length: doc.countPages() })
        .map(() => <img/> as HTMLImageElement)
    const thumbnails = images
        .map((img, idx) => 
            <div class="thumbnail"
                data-page={idx}
                onMouseEnter={mouseEnter.bind(owner)}>
                { img }
                <i onClick={deletePage} class="bi bi-trash-fill"/>
            </div>
        )


    const deletedPages: number[] = [];
    function deletePage(event: MouseEvent & { currentTarget: HTMLElement }) {
        const thumbnail = event.currentTarget.parentElement!;
        const page = Number(thumbnail.dataset.page);

        const removeThumbnailEvent = new Event('еееRemoveThumbnail');
        thumbnail.dispatchEvent(removeThumbnailEvent);


        deletedPages.push(page);
        thumbnail.remove();
    }

    function renderOneThumbnail(pageIndex: number) {
        if (pageIndex + 1 < images.length)
            setTimeout(() => renderOneThumbnail(pageIndex + 1));

        const img = images[pageIndex];
        [img.width, img.height, img.src] = pageContext.renderAtSize(pageIndex, thumbnailMaxDimension);
    }

    renderOneThumbnail(0);

    let horizontalThumbnails: HTMLDivElement;
    let filenameInput: HTMLInputElement;

    function updateScrollable() {
        setIsScrollable(horizontalThumbnails.scrollWidth > horizontalThumbnails.offsetWidth);
        setCanScrollLeft(horizontalThumbnails.scrollLeft > 0);
        setCanScrollRight(horizontalThumbnails.scrollLeft < (horizontalThumbnails.scrollWidth - horizontalThumbnails.offsetWidth));
    }

    const observer = new ResizeObserver(updateScrollable);

    onMount(() => {
        updateScrollable();
        observer.observe(horizontalThumbnails);
    })

    onCleanup(() => {
        observer.unobserve(horizontalThumbnails);
    })

    createEffect(() => {
        if (!isScrollable()) {
            setCanScrollLeft(false);
            setCanScrollRight(false);
        }
    })

    function thumbnailScroll() {
        updateScrollable();
    }

    function scrollThumbnails(dir: "left"|"right") {
        const dx = horizontalThumbnails.offsetWidth * 0.80 * (-1) ** Number(dir === "left");
        horizontalThumbnails.scrollBy({ left: dx, behavior: 'smooth' });
    }

    function continueToEditor() {
        const deletedPagesSet = new Set(deletedPages.map(idx => doc.loadPage(idx).pointer));
        StateScriptTransferObject.create(mupdf, doc, filenameInput.value, deletedPagesSet);
        navigate("/new-script", { state: doc });
        props.closer();
    }

    return (
        <>
            <input ref={filenameInput} 
                value={filenameToName(filename)}
                type="text"
                class="small-input"/>
            <p>
                Entferne Seiten, die nicht teil des Seiten die nicht teil des
                Skripts sind. Achte insbesondere auf Seiten am Ende des Dokuments
            </p>
            <div class="page-selector">
                <i class="bi bi-chevron-left" onClick={() => scrollThumbnails('left')}/>
                <i class="bi bi-chevron-right" onClick={() => scrollThumbnails('right')}/>
                <div ref={horizontalThumbnails}
                    class="horizontal-thumbnails"
                    classList={{'scroll-left': canScrollLeft(), 'scroll-right': canScrollRight()}}
                    onScroll={thumbnailScroll}>
                    { thumbnails }
                </div>
            </div>
            <div class="bottom-line">
                <button class="secondary-button" onClick={() => props.routeTo(FileUpload)}>
                    Zurück
                </button>
                <button class="primary-button" onClick={continueToEditor}>
                    Hochladen
                </button>
            </div>
        </>
    );
}

function FileUpload(
    props: {
        closer: () => void,
        routeTo: (comp: CBRComponent) => void
    }
): JSX.Element {
    const mupdfImport = import("mupdf");
    const [dragActive, setDragActive] = createSignal(false);
    const [error, setError] = createSignal(false);

    function dragOver(event: DragEvent) {
        event.preventDefault();
    }

    let dragCounter = 0;
    function dragEnter(event: DragEvent) {
        event.preventDefault();
        dragCounter++;
        setDragActive(true);
    }

    function dragLeave() {
        dragCounter--;
        if (dragCounter <= 0)
            setDragActive(false);
    }

    function drop(event: DragEvent) {
        setDragActive(false);
        event.preventDefault();
        const dataTransfer = event.dataTransfer;
        if (dataTransfer !== null && dataTransfer.files.length > 0)
            loadFile(dataTransfer.files[0]);
    }

    function inputChange(event: Event) {
        const target = event.target as HTMLInputElement;
        if (target.files !== null && target.files.length > 0)
            loadFile(target.files[0]);
    }

    async function loadFile(file: File) {
        if (file.type !== "application/pdf")
            setError(true);
        const [mupdf, data] = await Promise.all([mupdfImport, file.arrayBuffer()]);
        let doc: MupdfDocument;
        try {
            doc = mupdf.Document.openDocument(data);
            if (!doc.isPDF()) {
                setError(true);
                return;
            }
        } catch {
            setError(true);
            return;
        }
        props.routeTo(props => {
            return <PDFPageSelector 
                filename={file.name}
                mupdf={mupdf}
                doc={doc as PDFDocument}
                {...props}/>
        });

        // const element = <PDFPageSelector 
        //                     filename={file.name}
        //                     mupdf={mupdf}
        //                     doc={doc as PDFDocument}/>;
        // setCurrentStep({ element, name: "page-selector" });
    }

    return (
        <>
            <label class="file-area"
                classList={{'drag-active': dragActive()}}
                onDragOver={dragOver}
                onDragEnter={dragEnter}
                onDragLeave={dragLeave}
                onDrop={drop}>
                <input type="file" 
                    accept="application/pdf"
                    onChange={inputChange}/>
                <UploadIcon/>
                <p>
                    Klicke order ziehe eine Datei auf diese Fläche, um sie in den PDF Editor zu laden
                </p>
            </label> 
            <span class="error-message" classList={{'visible': error()}}>
                Etwas was ist schief gelaufen
            </span>
            <div class="bottom-line">
                <button class="secondary-button" onClick={props.closer}>
                    Abbrechen
                </button>
            </div>
        </>
    );
}

type CBRComponent = Component<{ routeTo: (comp: CBRComponent) => void, closer: () => void }>;

export function NewScriptFileChooser(
    props: {
        closer: () => void
    }
): JSX.Element {
    const [currentStep, setCurrentStep] = createSignal<[CBRComponent]>([FileUpload]);

    const renderedElement = createMemo(() => {
        const [Child] = currentStep();
        return <Child routeTo={comp => setCurrentStep([comp])} {...props}/>
    });

    return (
        <div class="file-chooser">
            <h2>Skript aus Datei erstellen</h2>
            { renderedElement() }
        </div>
    );
}

declare global {
interface HTMLElementEventMap {
    'еееRemoveThumbnail': Event
}
}

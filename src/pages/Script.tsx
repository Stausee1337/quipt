import { JSX, createMemo, createSignal, useContext } from "solid-js";
import { ScriptViewer } from "../components/ScriptEdit";
import { MobileScriptRedirect } from "../components/ScriptTraining";
import PersonConfused from "../components/Person-Confused";
import { IsMobileContext } from "../App";
import { useAuthentication } from "../backend";
import { useNavigate } from "@solidjs/router";
import { DocumentView } from "../components/DocumentView";
import type { PDFDocument } from "mupdf"

export function ScriptRoute(): JSX.Element {
    const isMobile = useContext(IsMobileContext)!;

    return (
        <>
            { isMobile() ? <MobileScriptRedirect/> : <ScriptViewer/> }
        </>
    );
}

export function NewScriptRoute(): JSX.Element {
    const mupdfImport = import("mupdf");
    const [pdfDocument, setPdfDocument] = createSignal<PDFDocument>();
    const [mupdfLib, setMupdfLib] = createSignal<typeof import("mupdf")>();

    async function fileSelected(input: HTMLInputElement) {
        if (input.files === null || input.files.length === 0)
            return;
        const file = input.files[0];
        const [mupdf, data] = await Promise.all([mupdfImport, file.arrayBuffer()]);
        const doc = mupdf.Document.openDocument(data);
        if (!doc.isPDF())
            return;

        setMupdfLib(mupdf);
        setPdfDocument(doc as PDFDocument);
    }

    const pageContents = createMemo(() => {
        const doc = pdfDocument();
        if (doc === undefined) {
            return (
                <form>
                    <input type="file"
                        accept="application/pdf"
                        onChange={e => fileSelected(e.target)}/>
                </form>
            );
        }
        return (
            <DocumentView mupdf={mupdfLib()!} pdfDoc={doc}/>
        );
    });

    return (
        <>
            { pageContents() }
        </>
    );
}

export function NoScriptRoute(): JSX.Element {
    const navigate = useNavigate();
    const authentication = useAuthentication()!;
    const [getScripts] = authentication.requests!.getCached("/list-scripts");

    
    const x = createMemo(() => {
        if (getScripts.loading || getScripts.error)
            return;
        const scripts = getScripts();
        if (scripts !== undefined && scripts.length > 0) {
            navigate(`/script/${scripts[0].uuid!}`);
            return;
        }
        return (
            <div class="no-script">
                <PersonConfused/>
                <h2>Hmm ... Nichts Gefunden</h2>
                <div class="text">
                    Wie es Aussieht hast du noch keine Skripte. So kannst du eins hinzufügen:
                    <ul>
                        <li>Melde dich auf einem Desktop PC mit deinem Quipt Konto an</li>
                        <li>Lande ein PDF hoch und nutze unseren interaktiven Editor</li>
                        <li>order transkribiere dein Skript manuell</li>
                    </ul>
                </div>
            </div>
        );
    });

    return (
        <>
            { x() }
        </>
    );
}


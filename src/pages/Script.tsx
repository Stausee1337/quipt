import { JSX, createMemo, onMount } from "solid-js";
import { useNavigate, useLocation, Navigate } from "@solidjs/router";
import { ScriptViewer } from "../components/ScriptEdit";
import { MobileScriptRedirect } from "../components/ScriptTraining";
import PersonConfused from "../components/Person-Confused";
import { StateScriptTransferObject } from "../components/NewScriptFileChooser";
import { DocumentView } from "../components/DocumentView";
import { useQuery } from "@tanstack/solid-query";
import { PartialScript } from "../script";

// function Computer(): JSX.Element {
//     return (
//         <svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" fill="currentColor" class="bi bi-laptop" viewBox="0 0 16 16">
//             <path d="M13.5 3a.5.5 0 0 1 .5.5V11H2V3.5a.5.5 0 0 1 .5-.5zm-11-1A1.5 1.5 0 0 0 1 3.5V12h14V3.5A1.5 1.5 0 0 0 13.5 2zM0 12.5h16a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 0 12.5"/>
//         </svg>
//     );
// }

export function ScriptRoute(): JSX.Element {
    return <ScriptViewer/>;
}


export function NewScriptRoute(): JSX.Element {
    const location = useLocation();

    onMount(() => {
        document.title = "Neues Skript - Quipt"
    })

    const reneredElement = createMemo(() => {
        // if (isMobile()) {
        //     return (
        //         <div class="use-desktop">
        //             <Computer/>
        //             <h2>Nutze deinen Computer!</h2>
        //             <div class="text">
        //                 Skripte am Smartphone zu erstellen ist leider nicht mölich
        //                 <ul>
        //                     <li>Melde dich auf einem Desktop PC mit deinem Quipt Konto an</li>
        //                     <li>Lade ein PDF in unseren interaktiven Editor hoch</li>
        //                 </ul>
        //             </div>
        //         </div>
        //     );
        // }

        const transferObject = StateScriptTransferObject.retreive(location.state);
        if (transferObject === undefined)
            return <Navigate href="/"/>

        const { mupdf, document: pdfDoc, name, deletedPages } = transferObject;
        return <DocumentView
            mupdf={mupdf}
            pdfDoc={pdfDoc}
            name={name}
            deletedPages={deletedPages}/>
    });

    return reneredElement();
}

export function NoScriptRoute(): JSX.Element {
    const navigate = useNavigate();
    const scriptsQuery = useQuery<PartialScript[]>(() => ({ queryKey: ['scripts'] }));

    onMount(() => {
        document.title = "Kein Skript - Quipt"
    })
    
    const x = createMemo(() => {
        if (scriptsQuery.status === "pending")
            return;
        const scripts = scriptsQuery.data;
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


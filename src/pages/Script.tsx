import { JSX, createMemo, useContext } from "solid-js";
import { ScriptViewer } from "../components/ScriptEdit";
import { MobileScriptRedirect } from "../components/ScriptTraining";
import PersonConfused from "../components/Person-Confused";
import { IsMobileContext } from "../App";
import { useAuthentication } from "../backend";
import { useNavigate } from "@solidjs/router";

export function ScriptRoute(): JSX.Element {
    const isMobile = useContext(IsMobileContext)!;

    return (
        <>
            { isMobile() ? <MobileScriptRedirect/> : <ScriptViewer/> }
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

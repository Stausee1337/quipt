import { JSX, useContext } from "solid-js";
import { ScriptViewer } from "../components/ScriptEdit";
import { MobileScriptRedirect } from "../components/ScriptTraining";
import { IsMobileContext } from "../App";

export function ScriptRoute(): JSX.Element {
    const isMobile = useContext(IsMobileContext)!;

    return (
        <>
            { isMobile() ? <MobileScriptRedirect/> : <ScriptViewer/> }
        </>
    );
}

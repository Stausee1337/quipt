import { createSignal, JSX, createEffect, createContext, Component, createResource } from 'solid-js';
import { useParams } from '@solidjs/router';
import { AuthenticationContext, Division, Script } from './backend';

export const ScriptContextObj = createContext<ScriptContext>();

export interface ScriptContext {
    readonly currentScript: string|undefined;
    createNewScript(script: Script): Script;
    instantiateDelayed(component: Component<{ script: Readonly<Script> }>): JSX.Element;
    commitNewConfidences(divisionIdx: number, newScores: number[]): void;
}

export function createScriptContext(authenticationContext: AuthenticationContext): ScriptContext {
    const location = useParams();
    const [currentScriptId, setCurrentScriptId] = createSignal<string|undefined>(location.uuid);
    const scriptCache: Map<string, Script> = new Map();

    const [currentScript, { refetch, mutate }] = createResource(async () => {
        const currentId = currentScriptId();
        if (currentId === undefined)
            return undefined;
        let currentScript = scriptCache.get(currentId);
        if (currentScript !== undefined)
            return currentScript;
        const [script, error] = await authenticationContext.requests!.getParametrized("/script", currentId)
        if (error !== undefined) {
            setCurrentScriptId(undefined);
            throw `could not get script: ${error}`;
        }
        currentScript = script as Script;
        scriptCache.set(currentId, currentScript);
        return currentScript;
    });

    createEffect(() => {
        setCurrentScriptId(location.uuid); 
        refetch();
    });

    return {
        get currentScript() {
            return currentScriptId();
        },
        instantiateDelayed(Component) {
            return (
                <>
                    {
                        currentScript.state === "ready" && currentScript() !== undefined
                            ? <Component script={currentScript()!}/>
                            : null
                    }
                </>
            );
        },
        async commitNewConfidences(divisionIdx, newScores) {
            const script = currentScript()!;
            const division = script.divisions[divisionIdx];

            const totalScore = newScores.reduce((a, b) => a + b);

            const newDivision: Division = {
                name: division.name,
                description: division.description,
                textCues: division.textCues.map((textCue, idx) => {
                    return {
                        request: textCue.request,
                        response: textCue.response,
                        previousScores: [...textCue.previousScores, newScores[idx]]
                    };
                }),
                previousTotals: [...division.previousTotals, totalScore],
            };

            const newScript = { ...script };
            newScript.divisions[divisionIdx] = newDivision;

            mutate(newScript);

            const err = await authenticationContext.requests!
                .post("/commit-scores", { scriptId: script.uuid, divisionIdx, newScores });
            if (err !== undefined)
                console.error(err);
        },
        createNewScript(script) {
            const newScript = window.structuredClone(script);
            newScript.uuid = "abba-uuid-lol";
            scriptCache.set(newScript.uuid, newScript);

            const [scripts, { mutate }] = authenticationContext.requests!.getCached("/list-scripts");
            mutate([
                ...(scripts() ?? []),
                {
                    name: script.name,
                    uuid: "abba-uuid-lol",
                    divisions: []
                }
            ]);


            return newScript;
        },
    };
}

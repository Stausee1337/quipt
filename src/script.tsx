import { createSignal, JSX, createEffect, createContext, Component, createResource, createMemo } from 'solid-js';
import { createComponent } from 'solid-js/web';
import { useParams } from '@solidjs/router';
import { schemas } from 'qrpc-js';
import { AuthenticationContext } from './client';
import { Script } from './schemas';

export const ScriptContextObj = createContext<ScriptContext>();

export interface ScriptContext {
    readonly currentScript: string|undefined;
    createNewScript(script: Script): Promise<Script>;
    instantiateDelayed(
        component: Component<{ script: Readonly<Script> }>,
        onError: () => void
    ): JSX.Element;
    commitNewConfidences(divisionIdx: number, newScores: number[]): void;
    deleteScript(uuid: schemas.UUID): void;
    renameScript(uuid: schemas.UUID, name: string): void;
}

export function createScriptContext(authenticationContext: AuthenticationContext): ScriptContext {
    const location = useParams();
    let notValidatedScriptId: string|undefined = location.uuid;
    const [currentScriptId, setCurrentScriptId] = createSignal<schemas.UUID|undefined>(undefined);
    const scriptCache: Map<string, Script> = new Map();

    const [currentScript, { refetch, mutate }] = createResource(async () => {
        const currentId = notValidatedScriptId;
        if (currentId === undefined) {
            setCurrentScriptId(undefined);
            return undefined;
        }
        let currentScript = scriptCache.get(currentId);
        if (currentScript !== undefined) {
            setCurrentScriptId(currentScript.uuid);
            return currentScript;
        }

        let script: Script;
        try {
            script = await authenticationContext.services!.script.get({ uuid: currentId })
        } catch (error) {
            notValidatedScriptId = undefined;
            setCurrentScriptId(undefined);
            throw `could not get script: ${error}`;
        }
        setCurrentScriptId(script.uuid);
        currentScript = script as Script;
        scriptCache.set(currentId, currentScript);
        return currentScript;
    });

    createEffect(() => {
        notValidatedScriptId = location.uuid; 
        refetch();
    });

    return {
        get currentScript() {
            return currentScriptId();
        },
        instantiateDelayed(Component, onError) {
            const renderedElement = createMemo(() => {
                const condition = createMemo(() => currentScript.state === "ready" && currentScript() !== undefined);
                if (condition())
                    return createComponent(
                        Component,
                        {
                            get script() {
                                return currentScript()!;
                            }
                        }
                    );
                const isError = createMemo(() => currentScript.state === "errored");
                if (isError()) onError();
                return null;
            });

            return renderedElement as any;
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

            const err = await authenticationContext.services!
                .script.saveScores({ scriptId: script.uuid, divisionIdx, newScores });
            if (err !== undefined)
                console.error(err);
        },
        async createNewScript(script) {
            const newScript = window.structuredClone(script);
            let uuid: schemas.UUID;
            try {
                uuid = await authenticationContext.services!.script.create({ script });
            } catch (error) {
                throw `could not create new script: ${error}`;
            }
            const createdAt = Date.now();

            newScript.uuid = uuid;
            newScript.createdAt = createdAt;
            scriptCache.set(newScript.uuid, newScript);

            const [_, { refetch }] = authenticationContext.requests!.getCached("/list-scripts");
            refetch();

            return newScript;
        },
        async deleteScript(uuid) {  
            try {
                await authenticationContext.services!.script.delete({ uuid });
            } catch (error) {
                throw `could not delete script: ${error}`;
            }
            const [_, { refetch }] = authenticationContext.requests!.getCached("/list-scripts");
            refetch();
            scriptCache.delete(uuid);
        },
        async renameScript(uuid, name) {
            try {
                await authenticationContext.services!.script.rename({ uuid, name });
            } catch (error) {
                throw `could not rename script: ${error}`;
            }
            const [_, { refetch }] = authenticationContext.requests!.getCached("/list-scripts");
            refetch();
            const script = scriptCache.get(uuid);
            if (script === undefined)
                return;
            const newScript = window.structuredClone(script);
            newScript.name = name;
            scriptCache.set(uuid, newScript);
        },
    };
}

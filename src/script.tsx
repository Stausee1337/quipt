import { createSignal, JSX, createEffect, createContext, Component, createMemo, Accessor, untrack } from 'solid-js';
import { createComponent } from 'solid-js/web';
import { useParams } from '@solidjs/router';
import { schemas } from 'qrpc-js';
import { AuthenticationContext, queryClient } from './client';
import { Script } from './schemas';
import { useQuery } from '@tanstack/solid-query';

export const ScriptContextObj = createContext<ScriptContext>();

export type PartialScript = Omit<Script, "divisions">

export interface ScriptContext {
    readonly allScripts: Accessor<PartialScript[]>
    readonly currentScript: schemas.UUID|undefined;
    createNewScript(script: Script): Promise<Script>;
    instantiateDelayed(
        component: Component<{ script: Script }>,
        onError: () => void
    ): JSX.Element;
    commitNewConfidences(divisionIdx: number, newScores: number[]): void;
    deleteScript(uuid: schemas.UUID): void;
    renameScript(uuid: schemas.UUID, name: string): void;
}

// const STALE_TIME: number = 10 * 60_000; // 10 Minutes
const STALE_TIME: number = Infinity;

export function createScriptContext(authenticationContext: AuthenticationContext): ScriptContext {
    const location = useParams();

    const [currentScriptId, setCurrentScriptId] = createSignal<schemas.UUID|undefined>(undefined);
    // const scriptCache: Map<schemas.UUID, Script> = new Map();

    const scriptsQuery = useQuery(() => ({
        queryKey: ['scripts'],
        queryFn: () => authenticationContext.services!.script.list(),
        staleTime: STALE_TIME
    }))

    createEffect(async () => {
        let notValidatedScriptId: string|undefined = location.uuid;
        if (notValidatedScriptId === undefined) {
            setCurrentScriptId(undefined);
            return;
        }
        const scripts = await queryClient.ensureQueryData<Script[]>({ queryKey: ['scripts'] });
        const script = scripts.find(s => s.uuid === notValidatedScriptId);
        if (script === undefined) {
            setCurrentScriptId(undefined);
            return;
        }
        setCurrentScriptId(script.uuid);
    });

    // const [currentScript, { refetch, mutate }] = createResource(async () => {
    //     const currentId = notValidatedScriptId;
    //     if (currentId === undefined) {
    //         setCurrentScriptId(undefined);
    //         return undefined;
    //     }
    //     let currentScript = scriptCache.get(currentId);
    //     if (currentScript !== undefined) {
    //         setCurrentScriptId(currentScript.uuid);
    //         return currentScript;
    //     }

    //     let script: Script;
    //     try {
    //         script = await authenticationContext.services!.script.get({ uuid: currentId })
    //     } catch (error) {
    //         notValidatedScriptId = undefined;
    //         setCurrentScriptId(undefined);
    //         throw `could not get script: ${error}`;
    //     }
    //     setCurrentScriptId(script.uuid);
    //     currentScript = script as Script;
    //     scriptCache.set(currentId, currentScript);
    //     return currentScript;
    // });


    // createMemo(() => {
    //     <Test id={currentScriptId()}/>
    // })

    const scriptQuery = useQuery(() => ({
        queryKey: ['script', currentScriptId()],
        async queryFn() {
            const scriptUuid = untrack(currentScriptId);
            if (scriptUuid === undefined)
                throw 'unknown script'
            return await authenticationContext.services!.script.get({ uuid: scriptUuid });
        },
        staleTime: STALE_TIME
    }));

    const allScripts = createMemo<Script[]>(() => {
        if (scriptsQuery.status !== "success")
            return [];
        return scriptsQuery.data;
    })

    return {
        get allScripts() {
            return allScripts;
        },
        get currentScript() {
            return currentScriptId();
        },
        instantiateDelayed(Component, onError) {
            const renderedElement = createMemo(() => {

                const condition = createMemo(() => scriptQuery.status === "success");
                if (condition())
                    return createComponent(
                        Component,
                        {
                            get script() {
                                return scriptQuery.data!;
                            }
                        }
                    );
                const isError = createMemo(() => scriptQuery.status === "error");
                if (isError()) onError();
                return null;
            });

            return renderedElement as any;
        },
        async commitNewConfidences(divisionIdx, newScores) {
            const scriptId = currentScriptId()!;

            await queryClient.cancelQueries({ queryKey: ['script', scriptId] })
            queryClient.setQueryData<Script>(['script', scriptId], old => {
                if (!old) return old;

                const division = old.divisions[divisionIdx];
                return {
                    ...old,
                    divisions: Array.from({
                        ...old.divisions,
                        [divisionIdx]: {
                            ...old.divisions[divisionIdx],
                            textCues: division.textCues.map((pair, idx) => ({
                                ...pair,
                                previousScores: [...pair.previousScores, newScores[idx]]
                            })),
                            previousTotals: [...division.previousTotals, newScores.reduce((acc, n) => acc + n)]
                        },
                        length: old.divisions.length
                    })
                };
            })

            await authenticationContext.services!.script.saveScores({ scriptId: scriptId, divisionIdx, newScores });
        },
        async createNewScript(script) {
            const newScript = window.structuredClone(script);
            newScript.uuid = "00000000-0000-0000-0000-000000000000" as schemas.UUID;

            let uuid: schemas.UUID;
            try {
                uuid = await authenticationContext.services!.script.create({ script: newScript });
            } catch (error) {
                throw `could not create new script: ${error}`;
            }

            const createdAt = Date.now();

            newScript.uuid = uuid;
            newScript.createdAt = createdAt;

            queryClient.invalidateQueries({ queryKey: ['scripts'] });

            return newScript;
        },
        async deleteScript(uuid) {  
            try {
                await authenticationContext.services!.script.delete({ uuid });
            } catch (error) {
                throw `could not delete script: ${error}`;
            }

            queryClient.invalidateQueries({ queryKey: ['scripts'] });
            queryClient.removeQueries({ queryKey: ['script', uuid] });
        },
        async renameScript(uuid, name) {
            try {
                await authenticationContext.services!.script.rename({ uuid, name });
            } catch (error) {
                throw `could not rename script: ${error}`;
            }

            queryClient.invalidateQueries({ queryKey: ['scripts'] });
            queryClient.invalidateQueries({ queryKey: ['script', uuid] });
        },
    };
}

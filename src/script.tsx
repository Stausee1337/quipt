import { useParams } from 'react-router';
import { queryOptions, useMutation } from '@tanstack/react-query';
import { schemas } from 'qrpc-js';

import { AuthenticationContext, queryClient, useAuthentication } from 'quipt/client';
import { Script, TextCuePair } from 'quipt/schemas';


export type PartialScript = Omit<Script, 'divisions'>;

export function scriptsQueryOptions(authentication: AuthenticationContext) {
    return queryOptions<PartialScript[]>({
        queryKey: ['scripts'],
        queryFn: () => authentication.services!.script.list()
    });
}

export function scriptQueryOptions(authentication: AuthenticationContext, scriptID: schemas.UUID) {
    return queryOptions<Script>({
        queryKey: ['script', scriptID],
        async queryFn() {
            return await authentication.services!.script.get({ uuid: scriptID });
        },
    })
}

export type ScriptParams = {
    scriptID: schemas.UUID|undefined,
    divisionIdx: number|undefined
};

export function useScriptParams(): ScriptParams {
    const params = useParams();
    const division = parseInt(params.division ?? '');
    return {
        scriptID: params.uuid as (schemas.UUID|undefined),
        divisionIdx: isNaN(division) ? undefined : division - 1
    };
}

export function useCommitNewConfidences() {
    const authentication = useAuthentication();

    return useMutation({
        async mutationFn({
            scriptID,
            divisionIdx,
            newScores
        }: { scriptID: schemas.UUID; divisionIdx: number; newScores: number[]; }) {
            await queryClient.cancelQueries({ queryKey: ['script', scriptID] });
            queryClient.setQueryData<Script>(['script', scriptID], old => {
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
                                previousScores: [...pair.previousScores, newScores[idx]],
                            })),
                            previousTotals: [
                                ...division.previousTotals,
                                newScores.reduce((acc, n) => acc + n),
                            ],
                        },
                        length: old.divisions.length,
                    }),
                };
            });

            await authentication.services!.division.saveScores({
                scriptId: scriptID,
                divisionIdx,
                newScores,
            });
        }
    });
}

export function useDeleteScript() {
    const authentication = useAuthentication();

    return useMutation({
        async mutationFn({ scriptID }: { scriptID: schemas.UUID }) {
            await queryClient.cancelQueries({ queryKey: ['scripts'] });
            queryClient.setQueryData<PartialScript[]>(['scripts'], old => {
                if (!old) return old;

                return old.filter(s => s.uuid !== scriptID);
            });

            queryClient.removeQueries({ queryKey: ['script', scriptID] });

            try {
                await authentication.services!.script.delete({ uuid: scriptID });
            } catch (error) {
                throw `could not delete script: ${error}`;
            }
        }
    });
}

export function useRenameScript() {
    const authentication = useAuthentication();

    return useMutation({
        async mutationFn({ scriptID, name }: { scriptID: schemas.UUID, name: string }) {
            await queryClient.cancelQueries({ queryKey: ['scriptsXXXX'] });
            queryClient.setQueryData<PartialScript[]>(['scriptsXXXX'], old => {
                if (!old) return old;

                return old.map(s => (s.uuid !== scriptID ? s : { ...s, name }));
            });

            await queryClient.cancelQueries({ queryKey: ['script', scriptID] });
            queryClient.setQueryData<Script>(['script', scriptID], old => {
                if (!old) return old;

                return { ...old, name };
            });

            try {
                await authentication.services!.script.rename({ uuid: scriptID, name });
            } catch (error) {
                throw `could not rename script: ${error}`;
            }
        }
    });
}

// interface ScriptEditContext {
//     readonly scriptInfo: ScriptInfo;
//     updateDescription(newDescription: string): Promise<{ prev: Script }>;
//     renameDivision(newName: string): Promise<{ prev: Script }>;
//     deleteCue(index: number): Promise<{ prev: Script }>;
//     insertCue(index: number, newCue: TextCuePair): Promise<{ prev: Script }>;
//     updateCue(index: number, newCue: TextCuePair): Promise<{ prev: Script }>;
// }

export function useRenameDivision() {
    const authentication = useAuthentication();

    return useMutation({
        async mutationFn({
            scriptID,
            divisionIdx,
            name
        }: { scriptID: schemas.UUID; divisionIdx: number; name: string; }) {
            await queryClient.cancelQueries({
                queryKey: ['script', scriptID],
            });
            const prev = queryClient.getQueryData<Script>(['script', scriptID])!;

            queryClient.setQueryData<Script>(['script', scriptID], old => {
                if (!old) return old;

                return {
                    ...old,
                    divisions: Array.from({
                        ...old.divisions,
                        [divisionIdx]: {
                            ...old.divisions[divisionIdx],
                            name,
                        },
                        length: old.divisions.length,
                    }),
                };
            });

            await authentication.services!.division.rename({
                scriptId: scriptID,
                divisionIdx: divisionIdx,
                name,
            });
            return { prev };
        }
    });
}

export function useUpdateDivisionDescription() {
    const authentication = useAuthentication();
    return useMutation({
        async mutationFn({
            scriptID,
            divisionIdx,
            description 
        }: { scriptID: schemas.UUID; divisionIdx: number; description: string; }) {
            await queryClient.cancelQueries({
                queryKey: ['script', scriptID],
            });
            const prev = queryClient.getQueryData<Script>(['script', scriptID])!;
            queryClient.setQueryData<Script>(['script', scriptID], old => {
                if (!old) return old;

                return {
                    ...old,
                    divisions: Array.from({
                        ...old.divisions,
                        [divisionIdx]: {
                            ...old.divisions[divisionIdx],
                            description
                        },
                        length: old.divisions.length,
                    }),
                };
            });
            await authentication.services!.division.updateDescription({
                scriptId: scriptID,
                divisionIdx,
                description,
            });
            return { prev };
        }
    });
}

export function useCreateCue() {
    const authentication = useAuthentication();
    return useMutation({
        async mutationFn({
            scriptID,
            divisionIdx,
            cueIdx,
            cue
        }: { scriptID: schemas.UUID; divisionIdx: number; cueIdx: number; cue: TextCuePair; }) {
            await queryClient.cancelQueries({
                queryKey: ['script', scriptID],
            });
            const prev = queryClient.getQueryData<Script>(['script', scriptID])!;
            queryClient.setQueryData<Script>(['script', scriptID], old => {
                if (!old) return old;

                const textCues = old.divisions[divisionIdx].textCues;
                return {
                    ...old,
                    divisions: Array.from({
                        ...old.divisions,
                        [divisionIdx]: {
                            ...old.divisions[divisionIdx],
                            textCues: [
                                ...textCues.slice(0, cueIdx),
                                cue,
                                ...textCues.slice(cueIdx),
                            ],
                        },
                        length: old.divisions.length,
                    }),
                };
            });
            await authentication.services!.cue.insert({
                uuid: scriptID,
                divisionIdx,
                cueIdx,
                cue,
            });
            return { prev };
        }
    });
}

export function useUpdateCue() {
    const authentication = useAuthentication();
    return useMutation({
        async mutationFn({
            scriptID,
            divisionIdx,
            cueIdx,
            cue
        }: { scriptID: schemas.UUID; divisionIdx: number; cueIdx: number; cue: TextCuePair; }) {
            await queryClient.cancelQueries({
                queryKey: ['script', scriptID],
            });
            const prev = queryClient.getQueryData<Script>(['script', scriptID])!;
            queryClient.setQueryData<Script>(['script', scriptID], old => {
                if (!old) return old;

                const target = old.divisions[divisionIdx].textCues[cueIdx];
                return {
                    ...old,
                    divisions: Array.from({
                        ...old.divisions,
                        [divisionIdx]: {
                            ...old.divisions[divisionIdx],
                            textCues: old.divisions[divisionIdx].textCues.map(p =>
                                p !== target ? p : cue,
                            ),
                        },
                        length: old.divisions.length,
                    }),
                };
            });
            await authentication.services!.cue.update({
                uuid: scriptID,
                divisionIdx,
                cueIdx,
                newCue: cue,
            });
            return { prev };
        }
    });
}

export function useDeleteCue() {
    const authentication = useAuthentication();
    return useMutation({
        async mutationFn({
            scriptID,
            divisionIdx,
            cueIdx,
        }: { scriptID: schemas.UUID; divisionIdx: number; cueIdx: number; }) {
            await queryClient.cancelQueries({
                queryKey: ['script', scriptID],
            });
            const prev = queryClient.getQueryData<Script>(['script', scriptID])!;
            queryClient.setQueryData<Script>(['script', scriptID], old => {
                if (!old) return old;

                const toRemove = old.divisions[divisionIdx].textCues[cueIdx];
                return {
                    ...old,
                    divisions: Array.from({
                        ...old.divisions,
                        [cueIdx]: {
                            ...old.divisions[cueIdx],
                            textCues: old.divisions[cueIdx].textCues.filter(p => p !== toRemove),
                        },
                        length: old.divisions.length,
                    }),
                };
            });
            await authentication.services!.cue.delete({
                uuid: scriptID,
                divisionIdx,
                cueIdx,
            });
            return { prev };
        }
    });
}

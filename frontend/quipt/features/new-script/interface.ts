import { type Remote, wrap, expose } from 'comlink';

import CreateScriptWorker from './entry-worker?worker';
import type * as types from './types';

let globalInterface: Remote<types.API> | undefined;

export function getErrorMessage(error: types.Error): string {
    switch (error) {
        case 'invalid-file-format':
            return 'Datei konnte nichg gelesen werden';
        case 'non-script-document':
            return 'Die Datei konnte nicht als Skript errkant werden';
        case 'internal-error':
            return 'interner Fehler';
    }
}

export function initialize(api: types.API) {
    expose(api);
    self.postMessage({ type: 'ready' });
}

function getOrSetupWorker(): Promise<Remote<types.API>> {
    if (globalInterface !== undefined) return Promise.resolve(globalInterface);

    const newWorker = new CreateScriptWorker();
    const cabability = Promise.withResolvers<Remote<types.API>>();
    newWorker.addEventListener('message', e => {
        if (typeof e.data === 'object' && e.data.type === 'ready') {
            if (globalInterface === undefined) globalInterface = wrap<types.API>(newWorker);
            cabability.resolve(globalInterface);
        }
    });

    return cabability.promise;
}

async function toWorkerFile(file: File): Promise<types.File> {
    const data = await file.arrayBuffer();
    return {
        fileName: file.name,
        data,
    };
}

export async function processFile(file: File): Promise<types.Result> {
    const api = await getOrSetupWorker();
    return await api.processFile(await toWorkerFile(file));
}

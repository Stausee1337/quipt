import { type JSX, useReducer } from 'react';

import { Dialog } from '@base-ui/react';

import { Modal } from 'quipt/components/modal';
import { BigButton } from 'quipt/components/button';
import { randomID } from 'quipt/utils';
import { Loader } from 'quipt/components/loader';
import { FileInfoView } from './file-info-view';
import { FileUploadForm } from './file-upload-form';
import { processFile as workerProcessFile } from '../interface';

type Transition =
    | {
          kind: 'upload';
          file: File;
          loadingID: string;
      }
    | {
          kind: 'resolve';
          loadingID: string;
          error: string | undefined;
      }
    | {
          kind: 'error';
          error: string;
      };

type UploadIdleState = {
    kind: 'idle';
    error?: string | undefined;
};

type UploadLoadingState = {
    kind: 'loading';
    loadingID: string;
    file: File;
};

type UploadState = UploadIdleState | UploadLoadingState;

function machineReducer(state: UploadState, transition: Transition): UploadState {
    switch (transition.kind) {
        case 'upload':
            return {
                kind: 'loading',
                file: transition.file,
                loadingID: transition.loadingID,
            };
        case 'resolve':
            if (state.kind === 'loading' && state.loadingID === transition.loadingID)
                return { kind: 'idle', error: transition.error };
            return state;
        case 'error':
            if (state.kind === 'idle')
                return {
                    kind: 'idle',
                    error: transition.error,
                };
            return state;
    }
}

export function NewScriptModal(): JSX.Element {
    const [state, dispatch] = useReducer(machineReducer, { kind: 'idle' });

    async function startFileAnalysis(files: File[]) {
        const loadingID = randomID();
        if (files.length !== 1) {
            dispatch({ kind: 'error', error: 'Uploadfehler: Sie können nur eine Datei hochladen' });
            return;
        }

        const file = files[0];
        if (file.type !== 'application/pdf') {
            dispatch({ kind: 'error', error: 'Uploadfehler: Bitte laden Sie eine PDF-Datei hoch' });
            return;
        }

        dispatch({ kind: 'upload', loadingID, file });

        console.log(await workerProcessFile(file));

        dispatch({
            kind: 'resolve',
            loadingID,
            error: 'Konvertierungsfehler: Noch nicht implementiert',
        });
    }

    return (
        <Modal className="w-170" heading="Datei in Skript konvertieren">
            {state.kind === 'idle' && (
                <FileUploadForm onFileSubmit={startFileAnalysis} error={state.error} />
            )}
            {state.kind === 'loading' && <FileInfoView file={state.file} />}
            <div className="flex justify-between">
                <BigButton variant="secondary" render={<Dialog.Close />}>
                    Abbrechen
                </BigButton>
                <BigButton variant="primary" disabled={state.kind === 'idle'}>
                    {state.kind === 'loading' ? <Loader /> : 'Weiter'}
                </BigButton>
            </div>
        </Modal>
    );
}

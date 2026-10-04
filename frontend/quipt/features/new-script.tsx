import React, {
    type JSX,
    type RefObject,
    useId,
    useRef,
    useReducer,
    useEffect,
    useState,
} from 'react';

import { Dialog } from '@base-ui/react';

import { Modal } from 'quipt/components/modal';
import { BigButton } from 'quipt/components/button';
import { Icon } from 'quipt/components/icon';
import { randomID } from 'quipt/utils';
import { Loader } from 'quipt/components/loader';

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

interface FileUploadFormProps {
    error: string | undefined;
    onFileSubmit: (file: File[]) => void;
}

function makePreventHandlers(labelRef: RefObject<HTMLLabelElement | null>) {
    function dropHandler(e: DragEvent) {
        if ([...(e.dataTransfer?.items ?? [])].some(item => item.kind === 'file'))
            e.preventDefault();
    }

    function dragHandler(e: DragEvent) {
        if (e.dataTransfer === null) return;
        if (e.dataTransfer?.items === null) return;
        const fileItems = [...e.dataTransfer?.items].filter(item => item.kind === 'file');
        if (fileItems.length === 0) return;

        e.preventDefault();
        if (!labelRef.current?.contains(e.target as Node | null))
            e.dataTransfer.dropEffect = 'none';
    }

    return [dropHandler, dragHandler];
}

function FileUploadForm({ error, onFileSubmit }: FileUploadFormProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const labelRef = useRef<HTMLLabelElement>(null);

    const inputID = useId();
    const labelID = useId();
    const errorID = useId();

    const [dragActive, setDragActive] = useState(false);

    useEffect(() => {
        const [preventDropDefault, preventDragDefault] = makePreventHandlers(labelRef);
        window.addEventListener('drop', preventDropDefault);
        window.addEventListener('dragover', preventDragDefault);

        window.addEventListener('dragenter', dragActiveHandler);
        return () => {
            window.removeEventListener('drop', preventDropDefault);
            window.removeEventListener('dragover', preventDragDefault);

            window.removeEventListener('dragenter', dragActiveHandler);
        };
    });

    function dragActiveHandler(e: DragEvent) {
        labelRef.current && setDragActive(labelRef.current.contains(e.target as Node | null));
    }

    function dragHandler(e: React.DragEvent) {
        const fileItems = [...e.dataTransfer.items].filter(item => item.kind === 'file');
        if (fileItems.length === 0) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    }

    function dropHandler(e: React.DragEvent) {
        e.preventDefault();
        const files = Iterator.from(e.dataTransfer.items)
            .map(item => item.getAsFile())
            .filter(file => file !== null);
        onFileSubmit(Array.from(files));
    }

    function generateLabelClick(e: React.KeyboardEvent) {
        if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            labelRef?.current?.click();
        }
    }

    function onInputChange() {
        if (
            inputRef.current !== null &&
            inputRef.current.files !== null &&
            inputRef.current.files.length > 0
        )
            onFileSubmit(Array.from(inputRef.current.files));
    }

    return (
        <>
            <label
                id={`qpt-${labelID}`}
                ref={labelRef}
                onDrop={dropHandler}
                onDragOver={dragHandler}
                onKeyDown={generateLabelClick}
                htmlFor={`qpt-${inputID}`}
                data-drag-active={dragActive ? '' : undefined}
                tabIndex={0}
                aria-label="Skript hochladen"
                className="bg-background border-accent-30 data-drag-active:outline-primary flex cursor-pointer items-center justify-center gap-x-3 rounded-2xl border p-4 data-drag-active:outline-2">
                <Icon iconName="upload-arrow" className="text-accent-100 h-auto w-22.5" />
                <Modal.Description className="text-info text-accent-100 w-65">
                    Klicken Sie in diese Fläche order ziehen Sie eine Datei auf diese Fläche, um sie
                    in ein Skript zu konvertieren
                </Modal.Description>
            </label>
            <input
                id={`qpt-${inputID}`}
                ref={inputRef}
                className="hidden"
                tabIndex={-1}
                aria-hidden="true"
                accept="application/pdf"
                type="file"
                onChange={onInputChange}
                aria-labelledby={`qpt-${labelID}`}
            />
            {error !== undefined && (
                <div id={errorID} className="flex items-center gap-x-1 text-red-500">
                    <Icon iconName="exclamation-circle-fill" />
                    {error}
                </div>
            )}
        </>
    );
}

const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];

function formatFileSize(bytes: number): string {
    let size = bytes;
    let unit = 0;

    while (size >= 1024 && unit < units.length - 1) {
        size /= 1024;
        unit++;
    }

    return `${size.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function FileInfoView({ file }: { file: File }): JSX.Element {
    return (
        <div className="flex p-2">
            <Icon iconName="file-pdf" className="icon-2xl" aria-hidden="true" />
            <div className="flex flex-col">
                <p>{file.name}</p>
                <p className="text-info text-accent-100">{formatFileSize(file.size)}</p>
            </div>
        </div>
    );
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
        console.log(files);
        await new Promise(resolve => setTimeout(resolve, 1000));
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

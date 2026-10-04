import React, { type JSX, type RefObject, useId, useRef, useEffect, useState } from 'react';

import { Icon } from 'quipt/components/icon';
import { Modal } from 'quipt/components/modal';

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

export interface FileUploadFormProps {
    error: string | undefined;
    onFileSubmit: (file: File[]) => void;
}

export function FileUploadForm({ error, onFileSubmit }: FileUploadFormProps): JSX.Element {
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
    }, []);

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

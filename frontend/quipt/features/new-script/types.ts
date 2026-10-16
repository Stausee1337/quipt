import { type ScriptDocument } from 'quipt/schemas/script';
import { type Page } from '../../../pdf-ir';

export type Error = 'invalid-file-format' | 'internal-error' | 'non-script-document';

export type File = {
    fileName: string;
    data: ArrayBuffer;
};

export type BaseResult = {
    kind: 'error' | 'success';
    error?: Error | undefined;
    name?: string | undefined;
    script?: ScriptDocument | undefined;
    document?: Page[] | undefined;
};

export type ErrorResult = BaseResult & {
    kind: 'error';
    error: Error;
    name?: undefined;
    script?: undefined;
    document?: undefined;
};

export type SuccessResult = BaseResult & {
    kind: 'success';
    error?: undefined;
    name: string;
    script: ScriptDocument;
    document: Page[];
};

export type Result = ErrorResult | SuccessResult;

export type API = {
    processFile(file: File): Result;
};

import { type Script } from 'quipt/schemas/script';

export type Error = 'invalid-file-format' | 'internal-error' | 'non-script-document';

export type File = {
    fileName: string;
    data: ArrayBuffer;
};

export type BaseResult = {
    kind: 'error' | 'success';
    error?: Error | undefined;
    script?: Script | undefined;
};

export type ErrorResult = BaseResult & {
    kind: 'error';
    error: Error;
    script?: undefined;
};

export type SuccessResult = BaseResult & {
    kind: 'success';
    error?: undefined;
    script: Script;
};

export type Result = ErrorResult | SuccessResult;

export type API = {
    processFile(file: File): Result;
};


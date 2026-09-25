
export type Result<TOk = undefined, TErr = undefined> = {
    status: 'ok',
    value: TOk,
    error: undefined
} | {
    status: 'error',
    value: undefined,
    error: TErr,
};

export type ValueSubmitFunction<T = string, TErr = undefined> =
    (value: T) => Promise<Result<undefined, TErr>>;

export function error(): Result<any, undefined>;
export function error<T>(error: T): Result<any, T>;
export function error<T>(error?: T): Result<any, T> {
    return { value: undefined, error, status: 'error' };
}

export function isNumeric(value: string): boolean {
    for (let idx = 0; idx < value.length; idx++) {
        const code = value.charCodeAt(idx);
        if (code < 0x30 || code > 0x39)
            return false;
    }
    return true;
}

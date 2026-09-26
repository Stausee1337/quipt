import { type RefObject, useState } from 'react';

type CodeError = 'invalid-code';
type EmailError = 'email-not-found' | 'email-already-used' | 'invalid-email';
type NameError = 'invalid-name';
type PasswordError = 'incorrect-password';

export type SubmitError = CodeError | EmailError | NameError | PasswordError;

export type FormData<T extends string> = Record<T, string>;
export type FormErrors<T extends string> = Partial<Record<T, string | undefined>>;

type StringKeys<T extends Record<string, any>> = keyof T & string;
type PropperErrors<TDataErrorDescriptor extends Record<string, SubmitError>> = {
    [P in StringKeys<TDataErrorDescriptor>]?: TDataErrorDescriptor[P] | undefined;
};

export type DataSubmitFunction2<TDataErrorDescriptor extends Record<string, SubmitError>> = (
    data: FormData<StringKeys<TDataErrorDescriptor>>,
) => Promise<PropperErrors<TDataErrorDescriptor>>;

export declare function mapErrorToMessage(error: SubmitError): string;
export declare function mapErrorsToMessages<T extends Partial<Record<string, string>>>(
    errors: T,
): FormErrors<StringKeys<T>>;

export function useDataSubmit<
    TFn extends (data: FormData<TKeys>) => Promise<FormErrors<TKeys>>,
    TKeys extends string,
>(
    onDataSubmit: TFn | undefined,
    refs?: Partial<Record<TKeys, RefObject<HTMLInputElement | null>>>,
): [(data: FormData<TKeys>) => void, boolean, FormErrors<TKeys>] {
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<FormErrors<TKeys>>({});

    async function onSubmit(formData: FormData<TKeys>) {
        refs &&
            Object.values<RefObject<HTMLInputElement | null> | undefined>(refs).map(ref => {
                ref?.current?.blur();
            });
        if (onDataSubmit) {
            setLoading(true);
            const result = await onDataSubmit(formData);
            setLoading(false);
            setErrors(mapErrorsToMessages(result));
        }
    }

    return [onSubmit, loading, errors];
}

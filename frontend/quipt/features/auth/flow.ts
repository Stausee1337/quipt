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

export type DataSubmitFunction<TDataErrorDescriptor extends Record<string, SubmitError>> = (
    data: FormData<StringKeys<TDataErrorDescriptor>>,
) => Promise<PropperErrors<TDataErrorDescriptor>>;

const errorMessages = {
    'invalid-code': 'Ungültiger Code',
    'email-not-found': 'Kein Konto zu dieser E-Mail gefunden',
    'email-already-used': 'Es gibt bereits ein Konto zu dieser E-Mail',
    'invalid-email': 'Ungültige E-Mail',
    'invalid-name': 'Ungültiger Name',
    'incorrect-password': 'Falsches Passwort',
} satisfies { [P in SubmitError]: string };

export function mapErrorToMessage(error: SubmitError): string {
    return errorMessages[error];
}

export function mapErrorsToMessages<T extends Partial<Record<string, SubmitError>>>(
    errors: T,
): FormErrors<StringKeys<T>> {
    return Object.fromEntries(
        Object.entries(errors)
            .filter(([_, value]) => value !== undefined)
            .map(([key, value]) => [key, value ? mapErrorToMessage(value) : undefined])) as FormErrors<StringKeys<T>>;
}

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

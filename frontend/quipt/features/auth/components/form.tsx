import {
    type JSX,
    type ComponentType,
    type ReactNode,
    type Ref,
    type RefObject,
    useEffect,
    useRef,
    useState,
    createElement,
} from 'react';

import classnames from 'classnames';
import { Form as BaseForm } from '@base-ui/react';

import { Icon } from 'quipt/components/icon';
import { BigButton } from 'quipt/components/button';
import { Loader } from 'quipt/components/loader';

type ErrorDescriptor = Record<string, SubmitError>;
type StringKeys<T extends Record<string, any>> = keyof T & string;

export type FormData<TErrors extends ErrorDescriptor> = Record<StringKeys<TErrors>, string>;

export type FormErrors<TErrors extends ErrorDescriptor> = {
    [P in StringKeys<TErrors>]?: TErrors[P] | undefined;
};

export interface FormContentProps {
    heading: string;
    helpInfo: ReactNode;
}

export interface FormDataProps<TErrors extends ErrorDescriptor> {
    errors: FormErrors<TErrors>;
    onDataSubmit?: (formData: FormData<TErrors>) => Promise<void>;
}

export interface FormProps<T extends ErrorDescriptor> extends FormDataProps<T>, FormContentProps {
    loading?: boolean | undefined;
    submitButtonRef?: Ref<HTMLButtonElement | null> | undefined;
    children: ReactNode;
}

// FIXME: whats the difference between the two things named `Form` in that file
export function Form<T extends ErrorDescriptor = ErrorDescriptor>({
    heading,
    helpInfo,
    loading,
    children,
    submitButtonRef,

    errors,
    onDataSubmit,
}: FormProps<T>) {
    const actionsRef = useRef<BaseForm.Actions | null>(null);
    useEffect(() => {
        actionsRef.current?.validate();
    }, [actionsRef.current]);

    return (
        <BaseForm<FormData<T>>
            actionsRef={actionsRef}
            validationMode="onChange"
            data-loading={loading ? '' : undefined}
            className={classnames(
                'sm:bg-accent-100/10 border-accent-100/30 flex w-full flex-col gap-6 overflow-hidden border p-8 data-loading:pointer-events-none data-loading:opacity-50 sm:mx-auto sm:w-120 sm:self-center sm:rounded-4xl',
            )}

            errors={mapErrorsToMessages(errors)}
            onFormSubmit={onDataSubmit}>
            <Icon iconName="quipt-logo" className="text-primary mx-auto h-12 w-auto" />
            <div>
                <h2 className="text-heading-2">{heading}</h2>
                <p className="pt-1">{helpInfo}</p>
            </div>
            {children}
            <FlowControl submitButtonRef={submitButtonRef} loading={loading} />
        </BaseForm>
    );
}

function FlowControl(props: {
    submitButtonRef?: Ref<HTMLButtonElement | null> | undefined;
    loading?: boolean | undefined;
}) {
    return (
        <div className="flex items-center justify-between">
            <BigButton variant="secondary">Zurück</BigButton>
            <BigButton
                ref={props.submitButtonRef}
                variant="primary"
                type="submit"
                focusableWhenDisabled
                disabled={props.loading}>
                {props.loading ? <Loader /> : <>Weiter</>}
            </BigButton>
        </div>
    );
}

type ByName<T extends readonly Form<any, any, any>[]> = {
    [F in T[number] as F['name']]: F;
};

export interface Form<
    TName extends string,
    TArgs extends Record<string, any>,
    TErrors extends ErrorDescriptor,
> {
    name: TName;
    renderForm: (
        args: TArgs,
        errors: FormErrors<TErrors>,
        onDataSubmit: (formData: FormData<TErrors>) => Promise<void>,
    ) => JSX.Element;
}

export function form<
    const TName extends string,
    TProps extends Record<string, any>,
    TStaticProps extends Partial<TProps>,
    TErrors extends ErrorDescriptor,
>(
    name: TName,
    component: ComponentType<FormDataProps<TErrors> & TProps>,
    staticProps: TStaticProps,
): Form<TName, Omit<TProps, 'errors' | 'onDataSubmit' | (keyof TStaticProps & string)>, TErrors> {
    return {
        name,
        renderForm(args, errors, onDataSubmit) {
            const props = { ...staticProps, ...args } as TProps;
            return createElement(component, {
                ...props,
                errors,
                onDataSubmit,
            });
        },
    };
}

export function recordByName<TForms extends Form<any, any, any>[]>(
    ...forms: TForms
): Readonly<ByName<TForms>> {
    return Object.freeze(Object.fromEntries(forms.map(form => [form.name, form])));
}

type CodeError = 'invalid-code';
type EmailError = 'email-not-found' | 'email-already-used' | 'invalid-email';
type NameError = 'invalid-name';
type PasswordError = 'incorrect-password';

export type SubmitError = CodeError | EmailError | NameError | PasswordError;

const errorMessages = {
    'invalid-code': 'Ungültiger Code',
    'email-not-found': 'Kein Konto zu dieser E-Mail gefunden',
    'email-already-used': 'Es gibt bereits ein Konto zu dieser E-Mail',
    'invalid-email': 'Ungültige E-Mail',
    'invalid-name': 'Ungültiger Name',
    'incorrect-password': 'Falsches Passwort',
} satisfies { [P in SubmitError]: string };

function mapErrorToMessage(error: SubmitError): string {
    return errorMessages[error];
}

function mapErrorsToMessages<TErrors extends ErrorDescriptor>(
    errors: FormErrors<TErrors>,
): Record<StringKeys<TErrors>, string> {
    return Object.fromEntries(
        (
            (Object.entries(errors) as [StringKeys<TErrors>, SubmitError | undefined][]).filter(
                ([_, value]) => value !== undefined,
            ) as [StringKeys<TErrors>, SubmitError][]
        ).map(([key, value]) => [key, mapErrorToMessage(value)]),
    ) as any;
}

export function useDataSubmit<
    TFn extends (data: Record<TKeys, string>) => Promise<void>,
    TKeys extends string,
>(
    onDataSubmit: TFn | undefined,
    refs?: Partial<Record<TKeys, RefObject<HTMLInputElement | null>>>,
): [(data: Record<TKeys, string>) => void, boolean] {
    const [loading, setLoading] = useState(false);

    async function onSubmit(formData: Record<TKeys, string>) {
        refs &&
            Object.values<RefObject<HTMLInputElement | null> | undefined>(refs).map(ref => {
                ref?.current?.blur();
            });
        if (onDataSubmit) {
            setLoading(true);
            await onDataSubmit(formData);
            setLoading(false);
            // setErrors(mapErrorsToMessages(result));
        }
    }

    return [onSubmit, loading];
}

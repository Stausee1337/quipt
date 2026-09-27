import {
    type JSX,
    type ComponentType,
    type ReactNode,
    type Ref,
    type RefObject,
    useEffect,
    useRef,
    createElement,
    useMemo,
    useImperativeHandle,
} from 'react';

import { Form as BaseForm } from '@base-ui/react';

import { BigButton } from 'quipt/components/button';
import { Loader } from 'quipt/components/loader';

type ErrorDescriptor = Record<string, SubmitError>;
type StringKeys<T extends Record<string, any>> = keyof T & string;

export type FormData<TErrors extends ErrorDescriptor> = Record<StringKeys<TErrors>, string>;

export type FormErrors<TErrors extends ErrorDescriptor> = {
    [P in StringKeys<TErrors>]?: TErrors[P] | undefined;
};

export interface FormActions extends BaseForm.Actions {
    submit: () => void;
}

export interface FormContentProps {
    heading: string;
    helpInfo: ReactNode;
}

export interface FormDataProps<TErrors extends ErrorDescriptor> {
    errors: FormErrors<TErrors>;
    loading: boolean;
    onDataSubmit?: (formData: FormData<TErrors>) => void;
}

export interface FormProps<T extends ErrorDescriptor> extends FormDataProps<T>, FormContentProps {
    actionsRef?: RefObject<FormActions | null> | undefined;
    children: ReactNode;
}

// FIXME: whats the difference between the two things named `Form` in that file
export function Form<T extends ErrorDescriptor = ErrorDescriptor>({
    heading,
    helpInfo,
    loading,
    children,
    actionsRef: formActionsRef,

    errors,
    onDataSubmit,
}: FormProps<T>) {
    const submitButtonRef = useRef<HTMLButtonElement>(null);
    const baseFormActionsRef = useRef<BaseForm.Actions | null>(null);

    useEffect(() => {
        baseFormActionsRef.current?.validate();
    }, [baseFormActionsRef.current]);

    useImperativeHandle(
        formActionsRef,
        () => ({
            submit: () => submitButtonRef.current?.click(),
            validate: () => baseFormActionsRef.current?.validate(),
        }),
        [baseFormActionsRef.current],
    );

    const messages = useMemo(() => mapErrorsToMessages(errors), [errors]);

    return (
        <BaseForm<FormData<T>>
            actionsRef={baseFormActionsRef}
            validationMode="onChange"
            className="flex w-full flex-col gap-6 overflow-hidden"

            errors={messages}
            onFormSubmit={onDataSubmit}>
            <div>
                <h2 className="text-heading-2">{heading}</h2>
                <p className="pt-1">{helpInfo}</p>
            </div>
            {children}
            <FlowNav
                submitButtonRef={submitButtonRef}
                loading={loading} // Prop drilling: More evidence `loading` should be *only* be a context thing
            />
        </BaseForm>
    );
}

function FlowNav(props: {
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
    renderForm: (args: TArgs, dataProps: FormDataProps<TErrors>) => JSX.Element;
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
): Form<
    TName,
    Omit<TProps, 'errors' | 'onDataSubmit' | 'loading' | (keyof TStaticProps & string)>,
    TErrors
> {
    return {
        name,
        renderForm(args, dataProps) {
            const props = { ...staticProps, ...args } as TProps;
            return createElement(component, {
                ...props,
                ...dataProps,
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

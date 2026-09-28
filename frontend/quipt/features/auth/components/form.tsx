import {
    type ReactNode,
    type Ref,
    type RefObject,
    useEffect,
    useRef,
    useMemo,
    useImperativeHandle,
    type FunctionComponent,
} from 'react';

import { Form as BaseForm } from '@base-ui/react';

import { BigButton } from 'quipt/components/button';
import { Loader } from 'quipt/components/loader';
import { useFlow } from './flow';

export interface FormActions extends BaseForm.Actions {
    submit: () => void;
}

export interface FormContentProps {
    heading: string;
    helpInfo: ReactNode;
}

export interface FormDataProps<TKeys extends string> {
    errors: Partial<Record<TKeys, SubmitError>>;
    onDataSubmit?: (formData: Record<TKeys, string>) => void;
}

export interface FormProps<TKeys extends string> extends FormDataProps<TKeys>, FormContentProps {
    actionsRef?: RefObject<FormActions | null> | undefined;
    children: ReactNode;
}

// FIXME: whats the difference between the two things named `Form` in that file
export function Form<TKeys extends string>({
    heading,
    helpInfo,
    children,
    actionsRef: formActionsRef,

    errors,
    onDataSubmit,
}: FormProps<TKeys>) {
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
        <BaseForm<Record<TKeys, string>>
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
            />
        </BaseForm>
    );
}

function FlowNav(props: {
    submitButtonRef?: Ref<HTMLButtonElement | null> | undefined;
}) {
    const { loading } = useFlow();

    return (
        <div className="flex items-center justify-between">
            <BigButton variant="secondary">Zurück</BigButton>
            <BigButton
                ref={props.submitButtonRef}
                variant="primary"
                type="submit"
                focusableWhenDisabled
                disabled={loading}>
                {loading ? <Loader /> : <>Weiter</>}
            </BigButton>
        </div>
    );
}

export type FormKeysOf<TForm extends FunctionComponent<any>> =
    TForm extends FunctionComponent<infer TProps>
        ? TProps extends FormDataProps<infer TKeys>
            ? TKeys
            : never
        : never;

export type FormDataOf<TForm extends FunctionComponent<any>> = Record<FormKeysOf<TForm>, string>;

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

function mapErrorsToMessages<TKeys extends string>(
    errors: Partial<Record<TKeys, SubmitError>>,
): Record<TKeys, string> {
    return Object.fromEntries(
        (
            (Object.entries(errors) as [TKeys, SubmitError | undefined][]).filter(
                ([_, value]) => value !== undefined,
            ) as [TKeys, SubmitError][]
        ).map(([key, value]) => [key, mapErrorToMessage(value)]),
    ) as any;
}

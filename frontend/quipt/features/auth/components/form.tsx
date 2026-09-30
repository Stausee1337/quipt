import {
    type FunctionComponent,
    type JSX,
    type ReactNode,
    type Ref,
    type RefObject,
    useEffect,
    useRef,
    useMemo,
    useImperativeHandle,
} from 'react';

import { Form as BaseForm } from '@base-ui/react';

import { BigButton } from 'quipt/components/button';
import { Loader } from 'quipt/components/loader';
import { type Flow, INTERNAL_useFlowContext } from './flow';
import { type SubmitError, mapErrorsToMessages } from '../schemas';
import { useNavigate } from 'react-router';

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

    const { flow, renderNavContent } = INTERNAL_useFlowContext();

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
                flow={flow}
                render={renderNavContent}
                submitButtonRef={submitButtonRef} />
        </BaseForm>
    );
}

export type NavRenderFunction = (flow: Flow) => JSX.Element|undefined;

function FlowNav({
    render,
    flow,
    submitButtonRef
}: {
    render: NavRenderFunction | undefined,
    flow: Flow,
    submitButtonRef?: Ref<HTMLButtonElement | null> | undefined
}) {
    const navigate = useNavigate();

    return (
        <div className="flex items-center justify-between">
            {
                render?.(flow) ?? (
                    <BigButton variant="secondary" onClick={() => navigate(-1)}>
                        { flow.state.stepIndex === 0 ? 'Abbrechen' : 'Zurück' }
                    </BigButton>
                )
            }
            <BigButton
                ref={submitButtonRef}
                variant="primary"
                type="submit"
                focusableWhenDisabled
                disabled={flow.loading}>
                {flow.loading ? <Loader /> : <>Weiter</>}
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


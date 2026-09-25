import { type ReactNode, type Ref, useEffect, useRef } from 'react';

import classnames from 'classnames';
import { Form as BaseForm } from '@base-ui/react';

import { Icon } from 'quipt/components/icon';
import { BigButton } from 'quipt/components/button';
import { Loader } from 'quipt/components/loader';

export type FormValues = BaseForm.Values;

export interface FormContentProps {
    heading: string;
    helpInfo: ReactNode;
}

export interface FormProps<T extends BaseForm.Values> extends BaseForm.Props<T>, FormContentProps {
    loading?: boolean | undefined;
    submitButtonRef?: Ref<HTMLButtonElement|null> | undefined;
}

export function Form<T extends BaseForm.Values = BaseForm.Values>({ heading, helpInfo, loading, children, className, ...props }: FormProps<T>) {
    const actionsRef = useRef<BaseForm.Actions | null>(null);
    useEffect(() => {
        actionsRef.current?.validate();
    }, [actionsRef.current]);

    return (
        <BaseForm<T>
            actionsRef={actionsRef}
            validationMode="onChange"
            data-loading={loading ? '' : undefined}
            className={classnames(
                'sm:bg-accent-100/10 border-accent-100/30 flex w-full flex-col gap-6 overflow-hidden border p-8 data-loading:pointer-events-none data-loading:opacity-50 sm:mx-auto sm:w-120 sm:self-center sm:rounded-4xl',
                className,
            )}
            {...props}>
            <Icon iconName="quipt-logo" className="text-primary mx-auto h-12 w-auto" />
            <div>
                <h2 className="text-heading-2">{heading}</h2>
                <p className="pt-1">{helpInfo}</p>
            </div>
            {children}
            <FlowControl
                submitButtonRef={props.submitButtonRef}
                loading={loading}/>
        </BaseForm>
    );
}

function FlowControl(props: {
    submitButtonRef?: Ref<HTMLButtonElement|null> | undefined;
    loading?: boolean |undefined ;
}) {
    return (
        <div className="flex items-center justify-between">
            <BigButton variant="secondary">
                Zurück
            </BigButton>
            <BigButton ref={props.submitButtonRef} variant="primary" type="submit" focusableWhenDisabled disabled={props.loading}>  
                {props.loading ? <Loader /> : <>Weiter</>}
            </BigButton>
        </div>
    );
}

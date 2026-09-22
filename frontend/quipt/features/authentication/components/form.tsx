import { ComponentProps, ReactNode, useEffect, useRef } from 'react';

import classnames from 'classnames';
import { Form as BaseForm } from '@base-ui/react';

import { Icon } from 'quipt/components/icon';

export interface FormProps extends ComponentProps<typeof BaseForm> {
    heading: string;
    helpInfo: ReactNode;

    loading?: boolean | undefined;
}

export function Form({ heading, helpInfo, loading, children, className, ...props }: FormProps) {
    const actionsRef = useRef<BaseForm.Actions | null>(null);
    useEffect(() => {
        actionsRef.current?.validate();
    }, [actionsRef.current]);

    return (
        <BaseForm
            actionsRef={actionsRef}
            validationMode="onChange"
            data-loading={loading ? '' : undefined}
            className={classnames(
                'sm:bg-accent-100/10 border-accent-100/30 flex w-full flex-col gap-6 overflow-hidden border p-8 sm:mx-auto sm:w-120 sm:self-center sm:rounded-4xl data-loading:opacity-50 data-loading:pointer-events-none',
                className
            )}
            {...props}>
            <Icon iconName="quipt-logo" className="text-primary mx-auto h-12 w-auto" />
            <div>
                <h2 className="text-heading-2">{heading}</h2>
                <p className="pt-1">{helpInfo}</p>
            </div>
            {children}
        </BaseForm>
    );
}

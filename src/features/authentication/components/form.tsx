import { ComponentProps, ReactNode, useEffect, useRef } from 'react';

import { Form as BaseForm } from '@base-ui/react';

import { Icon } from 'quipt/components/icon';

export interface FormProps extends ComponentProps<typeof BaseForm> {
    heading: string;
    helpInfo: ReactNode;
}

export function Form({
    heading,
    helpInfo,
    children,
    ...props
}: FormProps) {
    const actionsRef = useRef<BaseForm.Actions|null>(null);
    useEffect(() => {
        actionsRef.current?.validate();
    }, [actionsRef.current]);

    return (
        <BaseForm
            actionsRef={actionsRef}
            validationMode="onChange"
            className="sm:bg-accent-100/10 flex w-full flex-col gap-6 overflow-hidden p-8 sm:mx-auto sm:w-120 sm:self-center sm:rounded-4xl border border-accent-100/30"
            {...props}>
            <Icon iconName="quipt-logo" className="mx-auto h-12 w-auto text-primary"/>
            <div>
                <h2 className="text-heading-2">{ heading }</h2>
                <p className="pt-1">{ helpInfo }</p>
            </div>
            { children }
        </BaseForm>
    );
}


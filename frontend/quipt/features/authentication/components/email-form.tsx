import { type JSX, useRef, useState } from 'react';

import { Form, type FormContentProps } from './form';
import { TextField } from './field';
import * as validators from '../validators';
import type { ValueSubmitFunction } from '../util';

export interface EmailFormProps extends FormContentProps {
    onValueSubmit?: ValueSubmitFunction<string, string> | undefined;
}

export function EmailForm({ heading, helpInfo, onValueSubmit }: EmailFormProps): JSX.Element {
    const ref = useRef<HTMLInputElement>(null);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    async function onSubmit(formValues: { email: string }) {
        ref.current?.blur();
        setLoading(true);
        const result = (onValueSubmit && await onValueSubmit(formValues.email));
        setLoading(false);
        if (result?.status === 'error') 
            setErrors({ email: result.error });
    }

    return (
        <Form<{ email: string; }>
            errors={errors}
            heading={heading}
            helpInfo={helpInfo}
            loading={loading}
            onFormSubmit={onSubmit}>
            <TextField
                ref={ref}
                name="email"
                label="E-Mail"
                inputMode="email"

                validate={validators.multi(validators.required(), validators.email())}
                disabled={loading}
                autoFocus
            />
        </Form>
    );
}

import { type JSX, useRef } from 'react';

import { Form, type FormContentProps } from './form';
import { TextField } from './field';
import * as validators from '../validators';
import { type DataSubmitFunction2, useDataSubmit } from '../flow';

export interface EmailFormProps extends FormContentProps {
    onDataSubmit?: DataSubmitFunction2<{
        email: 'email-not-found' | 'email-already-used' | 'invalid-email';
    }>;
}

export function EmailForm({ heading, helpInfo, onDataSubmit }: EmailFormProps): JSX.Element {
    const inputRef = useRef<HTMLInputElement>(null);
    const [onSubmit, loading, errors] = useDataSubmit(onDataSubmit, { email: inputRef });

    return (
        <Form
            errors={errors}
            heading={heading}
            helpInfo={helpInfo}
            loading={loading}
            onFormSubmit={onSubmit}>
            <TextField
                ref={inputRef}
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

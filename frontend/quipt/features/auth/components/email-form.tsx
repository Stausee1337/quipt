import { type JSX } from 'react';

import { Form, type FormContentProps, type FormDataProps } from './form';
import { TextField } from './field';
import * as validators from '../validators';
import { useFlow } from './flow';

export interface EmailFormProps extends FormContentProps, FormDataProps<'email'> {}

export function EmailForm({ heading, helpInfo, ...props }: EmailFormProps): JSX.Element {
    const { loading } = useFlow();

    return (
        <Form heading={heading} helpInfo={helpInfo} {...props}>
            <TextField
                name="email"
                label="E-Mail"
                inputMode="email"
                autoComplete="email webauthn"
                spellCheck="false"

                validate={validators.multi(validators.required(), validators.email())}
                disabled={loading}
                autoFocus
            />
        </Form>
    );
}

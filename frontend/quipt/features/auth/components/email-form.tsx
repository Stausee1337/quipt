import { type JSX, useRef } from 'react';

import { Form, type FormContentProps, type FormDataProps } from './form';
import { TextField } from './field';
import * as validators from '../validators';

export interface EmailFormProps
    extends
        FormContentProps,
        FormDataProps<{
            email: 'email-not-found' | 'email-already-used' | 'invalid-email';
        }> {}

export function EmailForm({ heading, helpInfo, ...props }: EmailFormProps): JSX.Element {
    const inputRef = useRef<HTMLInputElement>(null);

    return (
        <Form heading={heading} helpInfo={helpInfo} {...props}>
            <TextField
                ref={inputRef}
                name="email"
                label="E-Mail"
                inputMode="email"
                autoComplete="email webauthn"
                spellCheck="false"

                validate={validators.multi(validators.required(), validators.email())}
                disabled={props.loading}
                autoFocus
            />
        </Form>
    );
}

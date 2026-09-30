import { type JSX, useState } from 'react';

import { Form, type FormContentProps, type FormDataProps } from './form';
import { TextField } from './field';
import * as validators from '../validators';
import { useFlow } from './flow';

export interface EmailFormProps extends FormContentProps, FormDataProps<'email'> {
    defaultValue?: string | undefined;
}

export function EmailForm({ defaultValue, ...props }: EmailFormProps): JSX.Element {
    const { loading } = useFlow();

    const [value, setValue] = useState(defaultValue ?? '');

    return (
        <Form {...props}>
            <TextField
                name="email"
                label="E-Mail"
                inputMode="email"
                autoComplete="email webauthn"
                spellCheck="false"

                value={value}
                onValueChange={setValue}

                validate={validators.multi(validators.required(), validators.email())}
                disabled={loading}
                autoFocus
            />
        </Form>
    );
}

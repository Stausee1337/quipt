import { type JSX, type ReactNode, useState } from 'react';

import { Form, type FormBaseProps } from './form';
import { TextField } from './field';
import * as validators from '../validators';
import { useFlow } from './flow';

export interface EmailFormProps extends FormBaseProps<'email'> {
    helpInfo: ReactNode;
}

export function EmailForm({ ...props }: EmailFormProps): JSX.Element {
    const { loading, state } = useFlow();

    const [value, setValue] = useState(state.data.email ?? '');

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

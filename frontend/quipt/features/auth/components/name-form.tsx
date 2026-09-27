import { type JSX, useRef } from 'react';

import { Form, type FormContentProps, type FormDataProps, useDataSubmit } from './form';
import { TextField } from './field';
import * as validators from '../validators';

const nameRegex = /^[\p{L}\p{M}]+(?:[ '-][\p{L}\p{M}]+)*$/u;

export interface NameFormProps extends FormContentProps, FormDataProps<{ name: 'invalid-name' }> {}

export function NameForm({ heading, helpInfo, ...props }: NameFormProps): JSX.Element {
    const inputRef = useRef<HTMLInputElement>(null);
    const [_, loading] = useDataSubmit(null as unknown as any, { name: inputRef });

    return (
        <Form heading={heading} helpInfo={helpInfo} loading={loading} {...props}>
            <TextField
                ref={inputRef}
                name="name"
                label="Ihr Name"

                validate={validators.multi(
                    validators.required(),
                    validators.regex(nameRegex, 'Name enthält ungültige Zeichen'),
                )}
                disabled={loading}
                autoFocus
            />
        </Form>
    );
}

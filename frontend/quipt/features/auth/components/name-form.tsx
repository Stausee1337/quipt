import { type JSX } from 'react';

import { Form, type FormContentProps, type FormDataProps } from './form';
import { TextField } from './field';
import * as validators from '../validators';

const nameRegex = /^[\p{L}\p{M}]+(?:[ '-][\p{L}\p{M}]+)*$/u;

export interface NameFormProps extends FormContentProps, FormDataProps<{ name: 'invalid-name' }> {}

export function NameForm({ heading, helpInfo, ...props }: NameFormProps): JSX.Element {
    return (
        <Form heading={heading} helpInfo={helpInfo} {...props}>
            <TextField
                name="name"
                label="Ihr Name"

                validate={validators.multi(
                    validators.required(),
                    validators.regex(nameRegex, 'Name enthält ungültige Zeichen'),
                )}
                disabled={props.loading}
                autoFocus
            />
        </Form>
    );
}

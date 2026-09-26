import { type JSX, useRef } from 'react';

import { Form, type FormContentProps } from './form';
import { TextField } from './field';
import * as validators from '../validators';
import { type DataSubmitFunction2, useDataSubmit } from '../flow';

const nameRegex = /^[\p{L}\p{M}]+(?:[ '-][\p{L}\p{M}]+)*$/u;

export interface NameFormProps extends FormContentProps {
    onDataSubmit?: DataSubmitFunction2<{ name: 'invalid-name' }>;
}

export function NameForm({ heading, helpInfo, onDataSubmit }: NameFormProps): JSX.Element {
    const inputRef = useRef<HTMLInputElement>(null);
    const [onSubmit, loading, errors] = useDataSubmit(onDataSubmit, { name: inputRef });

    return (
        <Form
            errors={errors}
            heading={heading}
            helpInfo={helpInfo}
            loading={loading}
            onFormSubmit={onSubmit}>
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

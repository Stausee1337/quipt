import { type JSX, useRef, useState } from 'react';

import { Form, type FormContentProps } from './form';
import { TextField } from './field';
import * as validators from '../validators';
import type { ValueSubmitFunction } from '../util';

const nameRegex = /^[\p{L}\p{M}]+(?:[ '-][\p{L}\p{M}]+)*$/u;

export interface NameFormProps extends FormContentProps {
    onValueSubmit?: ValueSubmitFunction | undefined;
}

export function NameForm({ heading, helpInfo, onValueSubmit }: NameFormProps): JSX.Element {
    const inputRef = useRef<HTMLInputElement>(null);
    const [loading, setLoading] = useState(false);

    async function onSubmit(formValues: { name: string; }) {
        inputRef.current?.blur();
        setLoading(true);
        (onValueSubmit && await onValueSubmit(formValues.name));
        setLoading(false);
    }

    return (
        <Form<{ name: string; }>
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

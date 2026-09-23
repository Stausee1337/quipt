import { JSX, useRef, useState } from 'react';

import { BigButton } from 'quipt/components/button';
import { StyledLink } from 'quipt/components/link';
import { Form } from './components/form';
import { TextField } from './components/field';
import * as validators from './validators';
import { Loader } from 'quipt/components/loader';

export function Authentication(): JSX.Element {
    const ref = useRef<HTMLInputElement>(null);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    function onSubmit() {
        ref.current?.blur();
        setLoading(true);
        setTimeout(() => {
            setLoading(false);
            setErrors({ email: 'Dieses Konto wurde nicht gefunden' });
        }, 1000);
    }

    return (
        <Form
            errors={errors}
            heading="Anmelden"
            helpInfo="Bei Ihrem Quipt Konto anmelden."
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
            <div className="flex items-center justify-between">
                <StyledLink to="signup">Konto erstellen</StyledLink>
                <BigButton variant="primary" type="submit" focusableWhenDisabled disabled={loading}>
                    {loading ? <Loader /> : <>Weiter</>}
                </BigButton>
            </div>
        </Form>
    );
}

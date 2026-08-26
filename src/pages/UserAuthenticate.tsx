import { JSX, createEffect, createSignal, onMount, splitProps } from 'solid-js';
import { Dynamic } from 'solid-js/web';

import { A, RouteSectionProps, useNavigate } from '@solidjs/router';

import { authService, useAuthentication } from 'quipt/client';
import Logo from 'quipt/components/Quipt-Logo';
import { FormEvent, Validity, useForm, validators } from 'quipt/forms';
import { AuthError } from 'quipt/schemas';

function convertErrorToMessage(error: AuthError): string {
    switch (error) {
        case 'INVALID_CREDENTIALS':
            return 'Benuzername order Passwort ist falsch';
        case 'USERNAME_MALFORMED':
            return 'Benuzername kann nicht vergeben werden';
        case 'USERNAME_ALREADY_EXISTS':
            return 'Der Benuzername exsitiert bereits';
        case 'WEAK_PASSWORD':
            return 'Das Passwort ist zu schwach';
    }
    throw 'unreachable';
}

const passwordRegex =
    /^(?=.*[0-9])(?=.*[A-Z])(?=.*[a-z])(?=.*[!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~]).+$/;
const regexError =
    'Passwort muss mindestens einen Groß- sowie Kleinbuchstaben, eine Zahl und ein Sonderzeichen enthalten';

export interface FormInputProps extends JSX.InputHTMLAttributes<HTMLInputElement> {
    errorMessage: string | undefined;
}

function FormInput(props: FormInputProps): JSX.Element {
    const [, rest] = splitProps(props, ['errorMessage']);
    return (
        <div class="input-box">
            <input {...rest} />
            <span class="error-message">{props.errorMessage}</span>
        </div>
    );
}

type SubmitFn = (event: FormEvent<['username', 'password']>) => Promise<string | undefined>;

function Signin(props: { onSubmit: SubmitFn }): JSX.Element {
    const [formSubmitted, setFormSubmitted] = createSignal(false);
    const [formValidity, setFormValidity] = createSignal<Validity>('valid');
    const [formErrorMessage, setFormErrorMessage] = createSignal<string>();

    const { username, password, form, validationMessages } = useForm(['username', 'password'], {
        onSubmit,
        onChange,
    });

    function onChange(event: FormEvent<['username', 'password']>) {
        setFormValidity(event.validity);
    }

    async function onSubmit(event: FormEvent<['username', 'password']>) {
        setFormSubmitted(true);
        const errorMessage = await props.onSubmit(event);
        if (errorMessage === undefined) return;
        setFormValidity('invalid');
        setFormErrorMessage(errorMessage);
        const passwordElement = event.elements.password;
        if (passwordElement !== undefined) {
            passwordElement.value = '';
            passwordElement.dispatchEvent(new Event('change', { bubbles: true }));
            passwordElement.focus();
        }
    }

    return (
        <>
            <h2>Anmelden</h2>
            <form
                classList={{ submitted: formSubmitted(), error: formErrorMessage() !== undefined }}
                {...form}>
                <FormInput
                    type="text"
                    placeholder="Benutzername"
                    errorMessage={validationMessages.username}
                    {...username({ validators: [validators.required] })}
                />
                <FormInput
                    type="password"
                    placeholder="Passwort"
                    errorMessage={validationMessages.password}
                    {...password({ validators: [validators.required] })}
                />
                <span class="error-message">{formErrorMessage()}</span>
                <p>
                    Du hat noch kein Konto? <A href="/signup">Jetzt eins erstellen!</A>
                </p>
                <button
                    class="primary-button"
                    disabled={formValidity() == 'invalid' && formSubmitted()}>
                    Anmelden
                </button>
            </form>
        </>
    );
}

function Signup(props: { onSubmit: SubmitFn }) {
    const [formSubmitted, setFormSubmitted] = createSignal(false);
    const [formValidity, setFormValidity] = createSignal<Validity>('valid');
    const [formData, setFormData] = createSignal({ username: '', password: '', password2: '' });
    const [formErrorMessage, setFormErrorMessage] = createSignal<string>();

    const { username, password, password2, form, validationMessages } = useForm(
        ['username', 'password', 'password2'],
        { onSubmit, onChange },
    );

    function onChange(event: FormEvent<['username', 'password', 'password2']>) {
        setFormValidity(event.validity);
        setFormData(event.formData);
    }

    async function onSubmit(event: FormEvent<['username', 'password', 'password2']>) {
        setFormSubmitted(true);
        const errorMessage = await props.onSubmit(event);
        if (errorMessage === undefined) return;
        setFormValidity('invalid');
        setFormErrorMessage(errorMessage);
        const usernameElement = event.elements.username;
        if (usernameElement !== undefined) {
            usernameElement.value = '';
            usernameElement.dispatchEvent(new Event('change', { bubbles: true }));
            usernameElement.focus();
        }
    }

    return (
        <>
            <h2>Quipt Konto erstellen</h2>
            <form
                classList={{ submitted: formSubmitted(), error: formErrorMessage() !== undefined }}
                {...form}>
                <FormInput
                    type="text"
                    placeholder="Benutzername"
                    {...username({ validators: [validators.required, validators.minLength(3)] })}
                    errorMessage={validationMessages.username}
                    autofocus
                />
                <FormInput
                    type="password"
                    placeholder="Passwort"
                    {...password({
                        validators: [
                            validators.required,
                            validators.lengthRange(8, 72),
                            validators.regex(passwordRegex, regexError),
                        ],
                    })}
                    errorMessage={validationMessages.password}
                />
                <FormInput
                    type="password"
                    placeholder="Passwort wiederholen"
                    {...password2({
                        validators: [validators.equal(() => formData().password, 'Passwort')],
                    })}
                    errorMessage={validationMessages.password2}
                />
                <span class="error-message">{formErrorMessage()}</span>
                <p>
                    Du bist bereits bei Quipt? <A href="/signin">Anmelden!</A>
                </p>
                <button
                    class="primary-button"
                    disabled={formValidity() == 'invalid' && formSubmitted()}>
                    Registrieren
                </button>
            </form>
        </>
    );
}

export function UserAuthenticate(props: RouteSectionProps): JSX.Element {
    const navigate = useNavigate()!;
    const authentication = useAuthentication()!;
    const [loading, setLoading] = createSignal(false);

    const keys: Record<string, string> = {
        '/signin': 'Anmelden',
        '/signup': 'Quipt Konto erstellen',
    };

    onMount(() => {
        document.title = keys[props.location.pathname] + ' - Quipt';
    });

    createEffect(() => {
        document.title = keys[props.location.pathname] + ' - Quipt';
    });

    function blur(event: FormEvent<['username', 'password']>) {
        Object.values(event.elements).forEach(element => element?.blur());
    }

    async function onSubmit(
        event: FormEvent<['username', 'password']>,
    ): Promise<string | undefined> {
        if (event.validity === 'invalid') return;

        setLoading(true);
        blur(event);

        const endpoint =
            props.location.pathname === '/signin'
                ? authService.signin.bind(authService)
                : authService.signup.bind(authService);

        const result = await endpoint({
            username: event.formData.username ?? '',
            password: event.formData.password ?? '',
        });

        setLoading(false);

        if (AuthError.isSchema(result)) return convertErrorToMessage(result);

        authentication.loginUser(result);
        navigate('/dashboard');
    }

    return (
        <div class="auth-box" classList={{ interactable: !loading() }}>
            <Logo />
            <Dynamic
                component={props.location.pathname === '/signin' ? Signin : Signup}
                onSubmit={onSubmit}
            />
        </div>
    );
}

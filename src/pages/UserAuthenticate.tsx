import { JSX, createEffect, createMemo, createSignal, onMount, splitProps } from 'solid-js';
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

function ErrorMessage(props: JSX.HTMLAttributes<HTMLSpanElement>): JSX.Element {
    return (
        <span class="text-qpt-red text-left" {...props}>
            <i class="bi bi-exclamation-circle-fill mr-1" />
            {props.children}
        </span>
    );
}

function Button(props: JSX.ButtonHTMLAttributes<HTMLButtonElement>): JSX.Element {
    return (
        <button
            class="bg-primary cursor-pointer rounded-full py-4 active:bg-[#03b66a] disabled:cursor-not-allowed disabled:bg-[#03844c] disabled:text-[#73b398]"
            {...props}>
            {props.children}
        </button>
    );
}

export interface FormInputProps extends JSX.InputHTMLAttributes<HTMLInputElement> {
    errorMessage: string | undefined;
    formSubmitted: boolean;
}

function FormInput(props: FormInputProps): JSX.Element {
    const [, rest] = splitProps(props, ['errorMessage', 'class', 'classList']);

    // FXIME: classList hack
    const isError = createMemo(
        () => (props?.classList?.touched || props.formSubmitted) && props?.classList?.invalid,
    );

    return (
        <div class="flex flex-col gap-2">
            <input
                class="border-lighter1 outline-lighter2 bg-accent2 rounded-full border border-solid px-5 py-4 outline-offset-1 focus:outline"
                classList={{ 'border-qpt-red': isError() }}
                {...rest}
            />
            {isError() && <ErrorMessage>{props.errorMessage}</ErrorMessage>}
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
            <h1 class="text-heading-1">Anmelden</h1>
            <form class="flex flex-col gap-8" {...form}>
                <FormInput
                    type="text"
                    placeholder="Benutzername"
                    errorMessage={validationMessages.username}
                    formSubmitted={formSubmitted()}
                    {...username({ validators: [validators.required] })}
                />
                <FormInput
                    type="password"
                    placeholder="Passwort"
                    errorMessage={validationMessages.password}
                    formSubmitted={formSubmitted()}
                    {...password({ validators: [validators.required] })}
                />
                {formErrorMessage() && <ErrorMessage>{formErrorMessage()}</ErrorMessage>}
                <p>
                    Du hat noch kein Konto?{' '}
                    <A href="/signup" class="text-link font-medium underline">
                        Jetzt eins erstellen!
                    </A>
                </p>
                <Button disabled={formValidity() == 'invalid' && formSubmitted()}>Anmelden</Button>
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
            <h1 class="text-heading-1">Quipt Konto erstellen</h1>
            <form class="flex flex-col gap-8" {...form}>
                <FormInput
                    type="text"
                    placeholder="Benutzername"
                    {...username({ validators: [validators.required, validators.minLength(3)] })}
                    errorMessage={validationMessages.username}
                    formSubmitted={formSubmitted()}
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
                    formSubmitted={formSubmitted()}
                    errorMessage={validationMessages.password}
                />
                <FormInput
                    type="password"
                    placeholder="Passwort wiederholen"
                    {...password2({
                        validators: [validators.equal(() => formData().password, 'Passwort')],
                    })}
                    formSubmitted={formSubmitted()}
                    errorMessage={validationMessages.password2}
                />
                {formErrorMessage() && <ErrorMessage>{formErrorMessage()}</ErrorMessage>}
                <p>
                    Du bist bereits bei Quipt?{' '}
                    <A href="/signin" class="text-link font-medium underline">
                        Jetzt eins erstellen!
                    </A>
                </p>
                <Button disabled={formValidity() == 'invalid' && formSubmitted()}>
                    Registrieren
                </Button>
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
        <div
            class="sm:bg-accent1 relative flex w-full flex-col gap-8 overflow-hidden p-8 text-center sm:mx-auto sm:w-120 sm:self-center sm:rounded-4xl"
            classList={{ interactable: !loading() }}>
            <Logo class="hidden h-12 md:block" />
            <Dynamic
                component={props.location.pathname === '/signin' ? Signin : Signup}
                onSubmit={onSubmit}
            />
        </div>
    );
}

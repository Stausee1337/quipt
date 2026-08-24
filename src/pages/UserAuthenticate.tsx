import { JSX, createEffect, createMemo, createSignal, onMount } from 'solid-js';

import { A, RouteSectionProps, useNavigate } from '@solidjs/router';

import { authService, useAuthentication } from 'quipt/client';
import Logo from 'quipt/components/Quipt-Logo';
import {
    QuiptFormEvent,
    createReactiveFormData,
    quiptForm,
    quiptValidator,
    validators,
} from 'quipt/forms';
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

    async function onSubmit(e: QuiptFormEvent) {
        if (!e.valid) {
            return;
        }

        const currentFormData = formData();
        setLoading(true);
        currentFormData.blur();

        const endpoint =
            props.location.pathname === '/signin'
                ? authService.signin.bind(authService)
                : authService.signup.bind(authService);

        const result = await endpoint({
            username: e.formData['username'] ?? '',
            password: e.formData['password'] ?? '',
        });

        setLoading(false);

        if (AuthError.isSchema(result)) {
            currentFormData.postErrorMessage(convertErrorToMessage(result));
            const input = props.location.pathname === '/signin' ? 'password' : 'username';
            currentFormData.resetInput(input);
            currentFormData.focus(input);
            return;
        }

        authentication.loginUser(result);
        navigate('/');
    }

    const [formData, setFormData] = createSignal(createReactiveFormData());

    const content = createMemo<JSX.Element>(() => {
        setFormData(createReactiveFormData());
        if (props.location.pathname === '/signin') {
            const [userMessage, setUserMeessage] = createSignal<string>();
            const [passwordMessage, setPasswordMessage] = createSignal<string>();
            return (
                <>
                    <div class="input-box">
                        <input
                            type="text"
                            name="username"
                            placeholder="Benutzername"
                            onQuiptValidationChange={e => setUserMeessage(e.message)}
                            use:quiptValidator={[validators.required]}
                        />
                        <span class="error-message">{userMessage()}</span>
                    </div>
                    <div class="input-box">
                        <input
                            type="password"
                            name="password"
                            placeholder="Passwort"
                            onQuiptValidationChange={e => setPasswordMessage(e.message)}
                            use:quiptValidator={[validators.required]}
                        />
                        <span class="error-message">{passwordMessage()}</span>
                    </div>
                    <span class="error-message">{formData().error}</span>
                    <p>
                        Du hat noch kein Konto? <A href="/signup">Jetzt eins erstellen!</A>
                    </p>
                    <button
                        class="primary-button"
                        disabled={!formData().valid && formData().submitted}>
                        Anmelden
                    </button>
                </>
            );
        } else {
            const [userMessage, setUserMeessage] = createSignal<string>();
            const [passwordMessage, setPasswordMessage] = createSignal<string>();
            const [password2Message, setPassword2Message] = createSignal<string>();
            return (
                <>
                    <div class="input-box">
                        <input
                            type="text"
                            placeholder="Benutzername"
                            name="username"
                            onQuiptValidationChange={e => setUserMeessage(e.message)}
                            use:quiptValidator={[validators.required, validators.minLength(3)]}
                        />
                        <span class="error-message">{userMessage()}</span>
                    </div>
                    <div class="input-box">
                        <input
                            type="password"
                            placeholder="Passwort"
                            name="password"
                            onQuiptValidationChange={e => setPasswordMessage(e.message)}
                            use:quiptValidator={[
                                validators.required,
                                validators.lengthRange(8, 72),
                                validators.regex(passwordRegex, regexError),
                            ]}
                        />
                        <span class="error-message">{passwordMessage()}</span>
                    </div>
                    <div class="input-box">
                        <input
                            type="password"
                            placeholder="Passwort wiederholen"
                            name="password2"
                            onQuiptValidationChange={e => setPassword2Message(e.message)}
                            use:quiptValidator={[
                                validators.equal(() => formData().data['password'], 'Passwort'),
                            ]}
                        />
                        <span class="error-message">{password2Message()}</span>
                    </div>
                    <span class="error-message">{formData().error}</span>
                    <p>
                        Du bist bereits bei Quipt? <A href="/signin">Anmelden!</A>
                    </p>
                    <button
                        class="primary-button"
                        disabled={!formData().valid && formData().submitted}>
                        Registrieren
                    </button>
                </>
            );
        }
    });

    return (
        <form
            class="auth-box"
            classList={{ interactable: !loading() }}
            use:quiptForm={formData()}
            onQuiptSubmit={onSubmit}>
            <Logo />
            <h2>{keys[props.location.pathname]}</h2>
            {content()}
        </form>
    );
}

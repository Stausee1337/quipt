import { JSX, ComponentProps, useEffect, useState, onMount } from 'quipt/rexport';

import { Link, useLocation, useNavigate } from 'react-router';
import classnames from 'classnames';

import { authService, useAuthentication } from 'quipt/client';
import Logo from 'quipt/components/Quipt-Logo';
import { FormEvent, Touchedness, Validity, useForm, validators } from 'quipt/forms';
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

function ErrorMessage({ className, children, ...rest }: ComponentProps<'span'>): JSX.Element {
    return (
        <span className={classnames('text-qpt-red text-left', className)} {...rest}>
            <i className="bi bi-exclamation-circle-fill mr-1" />
            {children}
        </span>
    );
}

function Button({ className, ...rest }: ComponentProps<'button'>): JSX.Element {
    return (
        <button
            className={classnames(
                'bg-primary cursor-pointer rounded-full py-4 active:bg-[#03b66a] disabled:cursor-not-allowed disabled:bg-[#03844c] disabled:text-[#73b398]',
                className,
            )}
            {...rest}/>
    );
}

export interface FormInputProps extends ComponentProps<'input'> {
    errorMessage: string | undefined;
    formSubmitted: boolean;
    touchedness: Touchedness,
    validity: Validity
}

function FormInput({
    errorMessage,
    formSubmitted,
    touchedness,
    validity,
    className,
    ...rest
}: FormInputProps): JSX.Element {

    const isError = (touchedness === 'touched' || formSubmitted) && validity === 'invalid';

    return (
        <div className="flex flex-col gap-2">
            <input
                className={classnames(
                    'border-lighter1 outline-lighter2 bg-accent2 rounded-full border border-solid px-5 py-4 outline-offset-1 focus:outline',
                    isError && 'border-qpt-red',
                )}
                {...rest}
            />
            {isError && <ErrorMessage>{errorMessage}</ErrorMessage>}
        </div>
    );
}

type SubmitFn = (event: FormEvent<['username', 'password']>) => Promise<string | undefined>;

function Signin(props: { onSubmit: SubmitFn }): JSX.Element {
    const [formSubmitted, setFormSubmitted] = useState(false);
    const [formValidity, setFormValidity] = useState<Validity>('valid');
    const [formErrorMessage, setFormErrorMessage] = useState<string>();

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
            <h1 className="text-heading-1">Anmelden</h1>
            <form className="flex flex-col gap-8" {...form}>
                <FormInput
                    type="text"
                    placeholder="Benutzername"
                    errorMessage={validationMessages.username}
                    formSubmitted={formSubmitted}
                    {...username({ validators: [validators.required] })}
                    autoFocus
                />
                <FormInput
                    type="password"
                    placeholder="Passwort"
                    errorMessage={validationMessages.password}
                    formSubmitted={formSubmitted}
                    {...password({ validators: [validators.required] })}
                />
                {formErrorMessage && <ErrorMessage>{formErrorMessage}</ErrorMessage>}
                <p>
                    Du hat noch kein Konto?{' '}
                    <Link to="/signup" className="text-link font-medium underline">
                        Jetzt eins erstellen!
                    </Link>
                </p>
                <Button disabled={formValidity == 'invalid' && formSubmitted}>Anmelden</Button>
            </form>
        </>
    );
}

function Signup(props: { onSubmit: SubmitFn }) {
    const [formSubmitted, setFormSubmitted] = useState(false);
    const [formValidity, setFormValidity] = useState<Validity>('valid');
    const [formData, setFormData] = useState({ username: '', password: '', password2: '' });
    const [formErrorMessage, setFormErrorMessage] = useState<string>();

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
            <h1 className="text-heading-1">Quipt Konto erstellen</h1>
            <form className="flex flex-col gap-8" {...form}>
                <FormInput
                    type="text"
                    placeholder="Benutzername"
                    {...username({ validators: [validators.required, validators.minLength(3)] })}
                    errorMessage={validationMessages.username}
                    formSubmitted={formSubmitted}
                    autoFocus
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
                    formSubmitted={formSubmitted}
                    errorMessage={validationMessages.password}
                />
                <FormInput
                    type="password"
                    placeholder="Passwort wiederholen"
                    {...password2({
                        validators: [validators.equal(formData.password, 'Passwort')],
                    })}
                    formSubmitted={formSubmitted}
                    errorMessage={validationMessages.password2}
                />
                {formErrorMessage && <ErrorMessage>{formErrorMessage}</ErrorMessage>}
                <p>
                    Du bist bereits bei Quipt?{' '}
                    <Link to="/signin" className="text-link font-medium underline">
                        Jetzt eins erstellen!
                    </Link>
                </p>
                <Button disabled={formValidity == 'invalid' && formSubmitted}>
                    Registrieren
                </Button>
            </form>
        </>
    );
}

export function UserAuthenticate(): JSX.Element {
    const navigate = useNavigate();
    const location = useLocation();
    const authentication = useAuthentication()!;
    // const [loading, setLoading] = useState(false);

    const keys: Record<string, string> = {
        '/signin': 'Anmelden',
        '/signup': 'Quipt Konto erstellen',
    };

    onMount(() => {
        document.title = keys[location.pathname] + ' - Quipt';
    });

    useEffect(() => {
        document.title = keys[location.pathname] + ' - Quipt';
    }, [location]);

    function blur(event: FormEvent<['username', 'password']>) {
        Object.values(event.elements).forEach(element => element?.blur());
    }

    async function onSubmit(
        event: FormEvent<['username', 'password']>,
    ): Promise<string | undefined> {
        if (event.validity === 'invalid') return;

        // setLoading(true);
        blur(event);

        const endpoint =
            location.pathname === '/signin'
                ? authService.signin.bind(authService)
                : authService.signup.bind(authService);

        const result = await endpoint({
            username: event.formData.username ?? '',
            password: event.formData.password ?? '',
        });

        // setLoading(false);

        if (AuthError.isSchema(result)) return convertErrorToMessage(result);

        await authentication.loginUser(result);
        navigate('/dashboard');
    }

    const Component = location.pathname === '/signin' ? Signin : Signup;

    return (
        <div
            className="sm:bg-accent1 relative flex w-full flex-col gap-8 overflow-hidden p-8 text-center sm:mx-auto sm:w-120 sm:self-center sm:rounded-4xl">
            <Logo className="hidden h-12 md:block" />
            <Component onSubmit={onSubmit} />
        </div>
    );
}

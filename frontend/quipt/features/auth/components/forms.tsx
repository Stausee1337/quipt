import { type JSX, type ComponentType, createElement } from 'react';

import { CodeForm } from './code-form';
import { EmailForm } from './email-form';
import { EmailCodeForm } from './email-code-form';
import { NameForm } from './name-form';
import { PasswordForm } from './password-form';
import { type DataSubmitFunction, type FormData, type SubmitError } from '../flow';

interface Form<
    TName extends string,
    TArgs extends Record<string, any>,
    TErrors extends Record<string, SubmitError>,
> {
    name: TName;
    renderForm: (args: TArgs, submit: DataSubmitFunction<TErrors>) => JSX.Element;
}

function form<
    const TName extends string,
    TProps extends Record<string, any>,
    TStaticProps extends Partial<TProps>,
    TErrors extends Record<string, SubmitError>,
>(
    name: TName,
    component: ComponentType<{ onDataSubmit?: DataSubmitFunction<TErrors> } & TProps>,
    staticProps: TStaticProps,
): Form<TName, Omit<TProps, 'onDataSubmit'|keyof TStaticProps>, TErrors> {
    return {
        name,
        renderForm(args, submit) {
            const props = {
                ...args,
                ...staticProps,
            } as TProps;
            return createElement(component, {
                ...props,
                onDataSubmit: submit,
                key: name,
            });
        },
    };
}

type ByName<T extends readonly Form<any, any, any>[]> = {
    [F in T[number] as F['name']]: F;
};

export function recordByName<TForms extends Form<any, any, any>[]>(...forms: TForms): Readonly<ByName<TForms>> {
    return Object.freeze(Object.fromEntries(forms.map(form => [form.name, form])));
}

const appOtpForm = form('app-otp', CodeForm, {
    codeLength: 6,
    heading: 'Identität bestätigen',
    helpInfo: 'Bitte geben Sie den Code aus Ihrer Zwei-Faktor-Authentisierungsapp ein.',
    children: null,
});

export type AppOtpForm = typeof appOtpForm;

const collectEmailForm = form('collect-email', EmailForm, {
    heading: 'Quipt Konto erstellen',
    helpInfo: 'Bitte geben Sie Ihre E-Mail Addresse ein.',
});

const emailOtpForm = form('email-otp', EmailCodeForm, {
    heading: 'Identität bestätigen',
});

const identifyForm = form('identify', EmailForm, {
    heading: 'Amnelden',
    helpInfo: 'Bei Ihrem Quipt Konto anmelden.',
});

const verifyEmail = form('verify-email', EmailCodeForm, {
    heading: 'E-Mail Addresse verifizieren',
});

const nameForm = form('name', NameForm, {
    heading: 'Willkommen',
    helpInfo: 'Bitte geben Sie Ihren Namen ein, um die Einrichtung abzuschließen.',
});

const passwordForm = form('password', PasswordForm, {
    heading: 'Identität bestätigen',
    helpInfo: 'Bitte geben Sie Ihr Passwort ein.',
});

export const forms = recordByName(
    appOtpForm,
    collectEmailForm,
    emailOtpForm,
    identifyForm,
    verifyEmail,
    nameForm,
    passwordForm,
);

export type Forms = typeof forms;
export type FormKind = keyof Forms;

export type FormArgsOf<F extends FormKind> =
    Forms[F] extends Form<any, infer TArgs, any> ? TArgs : never;
export type FormDataOf<F extends FormKind> =
    Forms[F] extends Form<any, any, infer TErrors> ? FormData<keyof TErrors & string> : never;
export type FormErrorsOf<F extends FormKind> =
    Forms[F] extends Form<any, any, infer TErrors> ? Partial<TErrors> : never;

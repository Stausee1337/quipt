import { EmailCodeForm } from './components/email-code-form';
import { EmailForm } from './components/email-form';

// signin
// signup
// setup password
// setup app-otp
//

// Rough idea (that'll never work). Only specify the static parts, and the dynamic parts will be
// handled by the flow. This basically has the same semantics as `EmailOtpForm` in
// `./components/email-otp-form.tsx`.
const emailOtpForm = form('email-otp', EmailCodeForm, {
    heading: 'Identität bestätigen',
});

const identifyForm = form('identify', EmailForm, {
    heading: 'Anmelden',
    helpInfo: 'Bei Ihrem Quipt Konto anmelden.',
});

const collectEmailForm = form('collect-email', EmailForm, {
    heading: 'Quipt Konto erstellen',
    helpInfo: 'Bitte geben Sie Ihre E-Mail Addresse ein.',
});

export const signinFlow = flow('signin', [
    identifyForm, // identify basicaly has signature () => { email: string; }
    emailOtpForm, // emailOtpForm basically has signature ({ email: string }) => void; Thats why they plug together
]);

export const signinFlow2 = flow('signin', [
    identifyForm, // identify basicaly has signature () => { email: string; }
    oneOf(appOtpForm, emailOtpForm, passwordForm), // these all need to have the same signature
]);

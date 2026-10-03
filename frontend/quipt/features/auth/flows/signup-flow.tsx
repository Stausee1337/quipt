import { withProps } from 'quipt/utils';
import { useAuthService } from 'quipt/schemas/auth';
import signinFlow from './signin-flow';
import { checkLoggedInLoader } from '../loader';
import { FlowLink, defineFlow } from '../components/flow-entry';
import { EmailForm } from '../components/email-form';
import { EmailCodeForm } from '../components/email-code-form';
import { NameForm } from '../components/name-form';

export default defineFlow({
    name: 'signup',
    handlers() {
        const authService = useAuthService();
        return {
            'collect-email': authService.collectEmail.bind(authService),
            'verify-email': authService.verifyEmail.bind(authService),
            name: authService.name.bind(authService),
        };
    },
    loader: checkLoggedInLoader,
    clientEntrypoint: 'collect-email',
    headings: {
        'collect-email': 'Quipt Konto erstellen',
        'verify-email': 'E-Mail Addresse verifizieren',
        name: 'Willkommen',
    },
    components: {
        'collect-email': withProps(EmailForm, {
            helpInfo: 'Bitte geben Sie Ihre E-Mail Addresse ein',
        }),
        'verify-email': EmailCodeForm,
        name: withProps(NameForm, {
            helpInfo: 'Bitte geben Sie Ihren Namen ein, um die Einrichtung abzuschließen',
        }),
    },
    renderNavContent(flow) {
        return flow.state.stepIndex === 0 ? (
            <FlowLink to={signinFlow}>Anmelden</FlowLink>
        ) : undefined;
    },
});

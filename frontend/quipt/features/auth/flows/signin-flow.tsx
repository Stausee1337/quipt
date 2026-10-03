import { withProps } from 'quipt/utils';
import { useAuthService } from 'quipt/schemas/auth';
import signupFlow from './signup-flow';
import { checkLoggedInLoader } from '../loader';
import { FlowLink, defineFlow } from '../components/flow-entry';
import { EmailForm } from '../components/email-form';
import { AppCodeForm } from '../components/code-form';
import { EmailCodeForm } from '../components/email-code-form';
import { PasswordForm } from '../components/password-form';

export default defineFlow({
    name: 'signin',
    handlers() {
        const authService = useAuthService();
        return {
            identify: authService.identify.bind(authService),
            'app-otp': authService.appOtp.bind(authService),
            'email-otp': authService.emailOtp.bind(authService),
            password: authService.password.bind(authService),
        };
    },
    loader: checkLoggedInLoader,
    clientEntrypoint: 'identify',
    headings: {
        identify: 'Anmelden',
        'app-otp': 'Identität bestätigen',
        'email-otp': 'Identität bestätigen',
        password: 'Identität bestätigen',
    },
    components: {
        identify: withProps(EmailForm, { helpInfo: 'Bei Ihrem Quipt Konto anmelden.' }),
        'email-otp': EmailCodeForm,
        'app-otp': AppCodeForm,
        password: PasswordForm,
    },
    renderNavContent(flow) {
        return flow.state.stepIndex === 0 ? (
            <FlowLink to={signupFlow}>Konto erstellen</FlowLink>
        ) : undefined;
    },
});

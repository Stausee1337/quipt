import { StyledLink } from 'quipt/components/link';
import { withProps } from 'quipt/utils';
import { EmailForm } from './email-form';
import { AppCodeForm } from './code-form';
import { EmailCodeForm } from './email-code-form';
import { PasswordForm } from './password-form';
import { defineFlow } from './flow-entry';
import { useAuthService } from '../schemas';

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
            <StyledLink to="/auth/signup?continue=http%3A%2F%2Flocalhost%3A5173%2Fapp&step=collect-email&index=0">
                Konto erstellen
            </StyledLink>
        ) : undefined;
    }
});



// signin
// signup
// setup password
// setup app-otp
//

import { EmailCodeForm } from './components/email-code-form';

export const signinFlow = flow('signin', [
    form({
        name: 'email-otp',
        component: EmailCodeForm,
    })
])


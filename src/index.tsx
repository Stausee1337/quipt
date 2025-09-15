/* @refresh reload */
import { render } from 'solid-js/web'

import './index.scss'
import App from './App';
import * as backend from './backend-types';

window.addEventListener('contextmenu', e => e.preventDefault())
const root = document.getElementById('root');
render(() => <App />, root!)

backend.refreshLogin()

// backend.post("/auth/signup", { email: "test@email.com", password: "yourMom123!" })
//     .then(([result, err]) => {
//         if (err != undefined) {
//             console.error("failed with", err);
//             return;
//         }
//         console.log(result);
//     });


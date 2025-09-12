/* @refresh reload */
import { render } from 'solid-js/web'

import './index.scss'
import App from './App';
import {createUser, isLoggedIn, renderBIP} from './install-helpers';
import * as Resources from './resources';

window.addEventListener('contextmenu', e => e.preventDefault())
window.addEventListener('beforeinstallprompt', (e) => {
    window.deferredEvent = e;
    e.preventDefault();
    renderBIP();
})
const root = document.getElementById('root');


(async function () {
    if (!isLoggedIn()) {
        await createUser();
    }
    // localStorage.setItem('credentials', '{"uuid":"bcf742e7-1208-4778-9131-f583c9bf5b26","password":"Start100!"}');

    // Resources.pollForUpdates();

    render(() => <App />, root!)
})();

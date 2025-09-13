/* @refresh reload */
import { render } from 'solid-js/web'

import './index.scss'
import App from './App';

window.addEventListener('contextmenu', e => e.preventDefault())
const root = document.getElementById('root');
render(() => <App />, root!)



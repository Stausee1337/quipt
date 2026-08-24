/* @refresh reload */
import { render } from 'solid-js/web';

import App from 'quipt/App';

import './index.scss';

const root = document.getElementById('root');
render(() => <App />, root!);

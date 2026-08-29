/* @refresh reload */
import { render } from 'solid-js/web';

import App from 'quipt/App';

import './index.css';

const root = document.createElement('div');
// root.id = 'root';
root.className = 'h-svh w-svw flex relative text-foreground bg-background';
document.body.prepend(root);
render(() => <App />, root!);

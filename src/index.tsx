import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from 'quipt/App';

import './index.css';

const root = document.createElement('div');
// root.id = 'root';
root.className = 'h-svh w-svw flex relative text-foreground bg-background';
document.body.append(root);
createRoot(root).render(
    <StrictMode>
    <App />
    </StrictMode>
);

import { type JSX } from 'react';

import { ScriptView } from './components/script';

export default function (): JSX.Element {
    return (
        <div className="flex w-full flex-col overflow-y-auto sm:ps-16">
            <ScriptView />
        </div>
    );
}

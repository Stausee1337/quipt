import { type JSX } from 'react';

import { useParams } from 'react-router';

import { getScript } from './dev-scripts';
import { ScriptView } from './components/script';

export default function (): JSX.Element {
    const params = useParams();
    const scriptID = params.scriptID;

    const script = scriptID !== undefined ? getScript(scriptID) : undefined;

    return (
        <div className="flex w-full flex-col overflow-y-auto sm:ps-16">
            { script && <ScriptView key={scriptID} script={script}/> }
        </div>
    );
}

export { newScript } from './dev-scripts';

import { JSX } from 'solid-js';


import { ScriptPage } from 'quipt/components/ScriptEdit';
import { DelayedScriptInstantiator } from 'quipt/script';

export function ScriptRoute(): JSX.Element {
    return <DelayedScriptInstantiator component={ScriptPage} />;
}

export function NewScriptRoute(): JSX.Element {
    return <>TODO</>
}


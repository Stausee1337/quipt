import { type JSX, useRef } from 'react';

import { useParams } from 'react-router';

import { getScript } from './dev-scripts';
import { ScriptView } from './components/script';

export function ScriptRoute(): JSX.Element {
    const params = useParams();
    const scriptID = params.scriptID;

    const script = scriptID !== undefined ? getScript(scriptID) : undefined;
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    return (
        <div
            ref={scrollContainerRef}
            className="flex w-full flex-col overflow-y-auto sm:ps-16"
            id="scroll-container">
            {script && (
                <ScriptView
                    key={scriptID}
                    scrollContainerRef={scrollContainerRef}
                    script={script}
                />
            )}
        </div>
    );
}

export { newScript } from './dev-scripts';

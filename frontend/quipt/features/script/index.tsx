import { type JSX, useRef, useState } from 'react';

import { useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';

import { ScriptEditorView } from './components/script';
import type { Ref, ScriptRepo } from 'quipt/schemas/script';
import { scriptQueryOptions } from './script';

export function ScriptRoute(): JSX.Element {
    const params = useParams();
    const [scrollContainer, setScrollContainer] = useState<HTMLElement | null>(null);
    const repoID = params.scriptID;

    const hasData = useRef(false);

    const script = useQuery({
        ...scriptQueryOptions(repoID as Ref<ScriptRepo>),
        subscribed: !hasData.current,
    });

    hasData.current = script.isSuccess;

    return (
        <div
            ref={setScrollContainer}
            className="flex w-full flex-col overflow-y-auto sm:ps-16"
            id="scroll-container">
            {script.isSuccess && (
                <ScriptEditorView
                    key={repoID}
                    scrollContainer={scrollContainer}
                    script={script.data}
                />
            )}
        </div>
    );
}

export { createScript as newScript } from './dev-scripts';

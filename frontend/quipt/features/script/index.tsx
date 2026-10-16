import { type JSX, useRef } from 'react';

import { useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';

import { ScriptView } from './components/script';
import type { Ref, ScriptRepo } from 'quipt/schemas/script';
import { scriptQueryOptions } from './script';

export function ScriptRoute(): JSX.Element {
    const params = useParams();
    const repoID = params.scriptID;

    const hasData = useRef(false);

    const script = useQuery({
        ...scriptQueryOptions(repoID as Ref<ScriptRepo>),
        subscribed: !hasData.current,
    });

    hasData.current = script.isSuccess;
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    return (
        <div
            ref={scrollContainerRef}
            className="flex w-full flex-col overflow-y-auto sm:ps-16"
            id="scroll-container">
            {script.isSuccess && (
                <ScriptView
                    key={repoID}
                    scrollContainerRef={scrollContainerRef}
                    script={script.data}
                />
            )}
        </div>
    );
}

export { createScript as newScript } from './dev-scripts';

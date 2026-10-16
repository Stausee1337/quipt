import { queryOptions } from '@tanstack/react-query';

import type {
    Ref,
    ScriptCommit,
    ScriptDocument,
    ScriptRepo,
    ScriptSettings,
} from 'quipt/schemas/script';
import { getCommit, getScriptRepo } from './dev-scripts';

export type Script = {
    name: string;
    document: ScriptDocument;
    settings: ScriptSettings;
    commit: ScriptCommit;
    repo: ScriptRepo;
};

export function scriptQueryOptions(repoID: Ref<ScriptRepo>) {
    return queryOptions<Script>({
        queryKey: ['script', repoID],
        async queryFn() {
            const repo = await getScriptRepo(repoID as Ref<ScriptRepo>);
            const commit = await getCommit(repo.commit);
            return {
                name: repo.name,
                document: commit.document,
                settings: repo.settings,
                commit,
                repo,
            };
        },
    });
}

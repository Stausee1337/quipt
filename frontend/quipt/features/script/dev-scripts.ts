import { type Ref, type ScriptDocument, type ScriptRepo, type User, type ScriptCommit } from 'quipt/schemas/script';
import { type Color, allColors } from 'quipt/color-palette';

function pickARandomColor(colors: Color[]): Color {
    const idx = Math.floor(Math.random() * colors.length);
    const color = colors[idx];
    colors.splice(idx, 1);
    return color;
}

function* assignColors(allActors: string[]): Generator<[string, Color]> {
    let currentColors = [...allColors];
    for (let actor of allActors) {
        if (currentColors.length === 0)
            currentColors.push(...allColors);
        yield [actor, pickARandomColor(currentColors)];
    }
}

export function createScript(name: string, document: ScriptDocument): Ref<ScriptRepo> {
    const commitID = crypto.randomUUID() as Ref<ScriptCommit>;
    window.commitMap[commitID] = {
        document,
        commiter: window.currentUser,
        parent: null,
        commitedAt: Date.now()
    };

    const colors = Object.fromEntries(assignColors(document.allActors));
    console.log(colors);

    const repoID = crypto.randomUUID() as Ref<ScriptRepo>;
    window.scriptRepoMap[repoID] = {
        name,
        commit: commitID,
        settings: {
            selfActor: null,
            colors
        }
    };
    return repoID as Ref<ScriptRepo>;
}

export async function getScriptRepo(ID: Ref<ScriptRepo>): Promise<ScriptRepo> {
    const result = window.scriptRepoMap[ID];
    if (result === undefined)
        throw Error('invalid ID');
    return result;
}

export async function getCommit(ID: Ref<ScriptCommit>): Promise<ScriptCommit> {
    const result = window.commitMap[ID];
    if (result === undefined)
        throw Error('invalid ID');
    return result;
}

if (typeof window !== 'undefined') {
    window.scriptRepoMap = {};
    window.commitMap = {};
    window.currentUser = crypto.randomUUID() as Ref<User>;
}

declare global {
    interface Window {
        scriptRepoMap: Record<Ref<ScriptRepo>, ScriptRepo>;
        commitMap: Record<Ref<ScriptCommit>, ScriptCommit>
        currentUser: Ref<User>;
    }
}

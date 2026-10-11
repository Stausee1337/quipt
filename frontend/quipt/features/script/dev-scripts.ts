import { type Script } from 'quipt/schemas/script';
import { randomID } from 'quipt/utils';

if (typeof window !== 'undefined')
    window.scriptMap = {};

export function newScript(script: Script): string {
    const id = randomID();
    window.scriptMap[id] = script;
    return id;
}

export function getScript(id: string): Script | undefined {
    return window.scriptMap[id];
}

declare global {
    interface Window {
        scriptMap: Record<string, Script>;
    }
}

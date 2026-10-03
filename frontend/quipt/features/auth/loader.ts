import { type LoaderFunctionArgs, redirect } from 'react-router';

import type { FlowData } from './components/flow';
import type { FlowEntry } from './components/flow-entry';

// FIXME: figure out if logged in
export function isLoggedIn(_args: Headers): boolean {
    return false;
}

export async function checkLoggedInLoader(args: LoaderFunctionArgs, _entry: FlowEntry, flowData: FlowData) {
    if (isLoggedIn(args.request.headers))
        throw redirect(flowData.continueTo);
}


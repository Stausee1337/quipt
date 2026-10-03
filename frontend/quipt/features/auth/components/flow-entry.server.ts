import {
    type LoaderFunctionArgs,
    data,
} from 'react-router';

import { type FlowData, parseFlowData } from './flow';
import type { FlowEntry, TransactionData } from './flow-entry';

function lookupTransaction(_transactionID: Uint8Array): TransactionData | undefined {
    return undefined;
}

function parseTransactionString(transaction: string | undefined): Uint8Array | undefined {
    if (transaction === undefined) return undefined;
    let array: Uint8Array;
    try {
        array = Uint8Array.fromBase64(transaction, {
            alphabet: 'base64url',
            lastChunkHandling: 'loose',
        });
    } catch (e) {
        return undefined;
    }
    if (array.length !== 24) return undefined;
    // FIXME: decide on specific format
    return array;
}

async function validateFlowDataServer(
    entry: FlowEntry,
    data: FlowData | undefined,
): Promise<TransactionData | undefined> {
    if (data === undefined) return undefined;
    if (!Object.keys(entry.components).includes(data.flowStep)) return undefined;
    if (data.transaction === undefined && data.flowStep === entry.clientEntrypoint)
        return {
            flowName: entry.name,
            activatedSteps: [entry.clientEntrypoint],
            containedData: null,
        };
    const transactionID = parseTransactionString(data.transaction);
    if (transactionID === undefined) return undefined;
    const transaction = lookupTransaction(transactionID);
    if (transaction === undefined) return undefined;
    if (transaction.flowName !== entry.name)
        return undefined;
    if (!transaction.activatedSteps.includes(data.flowStep)) return undefined;

    return transaction;
}

export function flowLoaderFactory(entry: FlowEntry) {
    return async (args: LoaderFunctionArgs) => {
        const flowData = parseFlowData(new URLSearchParams(args.url.search));
        const transactionData = await validateFlowDataServer(entry, flowData);
        if (transactionData === undefined) throw data('Invalid Request', { status: 400 });
        await entry.loader?.(args, entry, flowData!, transactionData);
        return transactionData.containedData;
    };
}


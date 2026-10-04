import { Document, type PDFDocument } from 'mupdf';
import { analyzeDocument, convertDocument } from '../../../pdf-ir';

import type * as types from './types';

export function processFile(file: types.File): types.Result {
    const doc = Document.openDocument(file.data);
    if (!doc.isPDF()) return { kind: 'error', error: 'invalid-file-format' };
    const baseIR = convertDocument(doc as PDFDocument);
    const annotatedIR = analyzeDocument(baseIR);

    return {
        kind: 'success',
        script: annotatedIR as unknown as types.Script,
    };
}

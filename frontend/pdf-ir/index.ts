import { PDFDocument } from 'mupdf';
import { convertDocument } from './pdf-ir';
import { analyzeDocument } from './analyzer';

export function doSomething(buffer: ArrayBuffer) {
    const doc = PDFDocument.openDocument(buffer) as PDFDocument;
    if (!doc.isPDF()) {
        return 'Document is not pdf error';
    }

    const pages = convertDocument(doc);
    const analyzedPages = analyzeDocument(pages);
    return analyzedPages;
}

console.log(globalThis);


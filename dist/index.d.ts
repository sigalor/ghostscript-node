/// <reference types="node" />
export declare function combinePDFs(pdfBuffers: Buffer[]): Promise<Buffer>;
export declare function countPDFPages(pdfBuffer: Buffer): Promise<number>;
export declare function extractPDFPages(pdfBuffer: Buffer, firstPage: number, lastPage: number): Promise<Buffer>;
export declare function rotatePDF(pdfBuffer: Buffer, direction: '90' | '180' | '270'): Promise<Buffer>;
/**
 * If `firstPage` is not given, 1 is used.
 * If `lastPage` is not given, the document's last page is used.
 * If `firstPage` is negative (e.g. -n), this refers to the last n pages and `lastPage` must be undefined.
 * All page numbers start at 1.
 */
export declare function renderPDFPagesToPNG(pdfBuffer: Buffer, firstPage?: number, lastPage?: number, resolution?: number): Promise<Buffer[]>;
export declare function isValidPDF(pdfBuffer: Buffer): Promise<boolean>;
/**
 * This function try, reduce size of your PDF not destroying quality
 * @param pdfBuffer Buffer
 * @returns Buffer
 */
export declare function compressPDF(pdfBuffer: Buffer): Promise<Buffer>;

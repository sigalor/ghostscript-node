declare module 'ghostscript-node' {
  export function combinePDFs(pdfBuffers: Buffer[]): Promise<Buffer>;
  export function countPDFPages(pdfBuffer: Buffer): Promise<number>;
  export function extractPDFPages(pdfBuffer: Buffer, firstPage: number, lastPage: number): Promise<Buffer>;
  export function rotatePDF(pdfBuffer: Buffer, direction: '90' | '180' | '270'): Promise<Buffer>;
  export function renderPDFPagesToPNG(
    pdfBuffer: Buffer,
    firstPage?: number,
    lastPage?: number,
    resolution?: number,
  ): Promise<Buffer[]>;
  export function isValidPDF(pdfBuffer: Buffer): Promise<boolean>;
}

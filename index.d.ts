declare module 'ghostscript-node' {
  export function combinePDFs(pdfBuffers: Buffer[]): Promise<Buffer>;
  export function countPDFPages(pdfBuffer: Buffer): Promise<number>;
  export function extractPDFPages(pdfBuffer: Buffer, firstPage: number, lastPage: number): Promise<Buffer>;
  export function rotatePDF(pdfBuffer: Buffer, direction: 'east' | 'south' | 'west'): Promise<Buffer>;
}

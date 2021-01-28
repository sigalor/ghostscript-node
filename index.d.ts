declare module 'ghostscript-node' {
  export function combinePDFs(pdfBuffers: Buffer[]): Buffer;
  export function countPDFPages(pdfBuffer: Buffer): number;
  export function extractPDFPages(pdfBuffer: Buffer, firstPage: number, lastPage: number): Buffer;
  export function rotatePDF(pdfBuffer: Buffer, direction: 'east' | 'south' | 'west'): Buffer;
}

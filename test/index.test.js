const fs = require('fs-extra');
const path = require('path');
const gs = require('..');

const pdfFiles = [];

beforeAll(() => {
  pdfFiles.push(fs.readFileSync(path.join(__dirname, 'pdf1.pdf')));
  pdfFiles.push(fs.readFileSync(path.join(__dirname, 'pdf2.pdf')));
});

test('combinePDFs', async () => {
  const res = await gs.combinePDFs(pdfFiles);
  await expect(gs.countPDFPages(res)).resolves.toBe(4);
});

test('countPDFPages', async () => {
  await expect(gs.countPDFPages(pdfFiles[0])).resolves.toBe(1);
  await expect(gs.countPDFPages(pdfFiles[1])).resolves.toBe(3);
});

test('countPDFPages fails for invalid PDF', async () => {
  await expect(gs.countPDFPages(Buffer.from([1, 2, 3]))).rejects.toThrow(
    /^Failed to determine number of pages in PDF: Command failed/,
  );
});

test('extractPDFPages', async () => {
  const res = await gs.extractPDFPages(pdfFiles[1], 2, 3);
  await expect(gs.countPDFPages(res)).resolves.toBe(2);
});

test('rotatePDF', async () => {
  const res = await gs.rotatePDF(pdfFiles[1], '90');
  await expect(gs.countPDFPages(res)).resolves.toBe(3);
});

const fs = require('fs-extra');
const path = require('path');
const gs = require('..');

const pdfFiles = [];

beforeAll(() => {
  pdfFiles.push(fs.readFileSync(path.join(__dirname, 'pdf1.pdf')));
  pdfFiles.push(fs.readFileSync(path.join(__dirname, 'pdf2.pdf')));
});

describe('combinePDFs', () => {
  test('works', async () => {
    const res = await gs.combinePDFs(pdfFiles);
    await expect(gs.countPDFPages(res)).resolves.toBe(4);
  });
});

describe('countPDFPages', () => {
  test('works', async () => {
    await expect(gs.countPDFPages(pdfFiles[0])).resolves.toBe(1);
    await expect(gs.countPDFPages(pdfFiles[1])).resolves.toBe(3);
  });

  test('fails for invalid PDF', async () => {
    await expect(gs.countPDFPages(Buffer.from([1, 2, 3]))).rejects.toThrow(
      /^Failed to determine number of pages in PDF: Command failed/,
    );
  });
});

describe('extractPDFPages', () => {
  test('works', async () => {
    const res = await gs.extractPDFPages(pdfFiles[1], 2, 3);
    await expect(gs.countPDFPages(res)).resolves.toBe(2);
  });
});

describe('rotatePDF', () => {
  test('works', async () => {
    const res = await gs.rotatePDF(pdfFiles[1], '90');
    await expect(gs.countPDFPages(res)).resolves.toBe(3);
  });
});

describe('renderPDFPagesToPNG', () => {
  test('works for single page PDF', async () => {
    const res = await gs.renderPDFPagesToPNG(pdfFiles[0]);
    expect(res.length).toBe(1);
  });

  test('works for three page PDF', async () => {
    const res = await gs.renderPDFPagesToPNG(pdfFiles[1]);
    expect(res.length).toBe(3);
  });

  test('works for second page of a PDF', async () => {
    const res = await gs.renderPDFPagesToPNG(pdfFiles[1], 2, 2);
    expect(res.length).toBe(1);
  });

  test('works for the last two pages of a PDF', async () => {
    const res = await gs.renderPDFPagesToPNG(pdfFiles[1], -2);
    expect(res.length).toBe(2);
  });

  test('fails when first page is 0', async () => {
    await expect(gs.renderPDFPagesToPNG(pdfFiles[0], 0)).rejects.toThrow('First page number out of range: 0');
  });

  test('fails when last page is out of range', async () => {
    await expect(gs.renderPDFPagesToPNG(pdfFiles[0], undefined, 3)).rejects.toThrow('Last page number out of range: 3');
  });

  test('fails when last page number is given when first page number is negative', async () => {
    await expect(gs.renderPDFPagesToPNG(pdfFiles[0], -1, 2)).rejects.toThrow(
      'Last page must be undefined when first page is negative',
    );
  });

  test('fails for invalid PDF', async () => {
    await expect(gs.renderPDFPagesToPNG(Buffer.from([1, 2, 3]))).rejects.toThrow(
      /^Failed to determine number of pages in PDF: Command failed/,
    );
  });
});

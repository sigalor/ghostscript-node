import * as gs from '../src/index';
import { FilesMap, getFiles } from './files';

let files: FilesMap;
beforeAll(async () => {
  files = await getFiles();
});

describe('combinePDFs', () => {
  test('works', async () => {
    const res = await gs.combinePDFs([files['pdf1.pdf'], files['pdf2.pdf']]);
    await expect(gs.countPDFPages(res)).resolves.toBe(4);
  });
});

describe('countPDFPages', () => {
  test('works', async () => {
    await expect(gs.countPDFPages(files['pdf1.pdf'])).resolves.toBe(1);
    await expect(gs.countPDFPages(files['pdf2.pdf'])).resolves.toBe(3);
  });

  test('fails for invalid PDF', async () => {
    await expect(gs.countPDFPages(Buffer.from([1, 2, 3]))).rejects.toThrow(
      /^Failed to determine number of pages in PDF: Command failed/,
    );
  });
});

describe('extractPDFPages', () => {
  test('works', async () => {
    const res = await gs.extractPDFPages(files['pdf2.pdf'], 2, 3);
    await expect(gs.countPDFPages(res)).resolves.toBe(2);
  });
});

describe('rotatePDF', () => {
  test('works', async () => {
    const res = await gs.rotatePDF(files['pdf2.pdf'], '90');
    await expect(gs.countPDFPages(res)).resolves.toBe(3);
  });
});

describe('convertToPDFA', () => {
  test('works', async () => {
    const res = await gs.convertToPDFA(files['pdf2.pdf']);
    await expect(gs.countPDFPages(res)).resolves.toBe(3);
  });
});

describe('renderPDFPagesToPNG', () => {
  test('works for single page PDF', async () => {
    const res = await gs.renderPDFPagesToPNG(files['pdf1.pdf']);
    expect(res.length).toBe(1);
  });

  test('works for three page PDF', async () => {
    const res = await gs.renderPDFPagesToPNG(files['pdf2.pdf']);
    expect(res.length).toBe(3);
  });

  test('works for second page of a PDF', async () => {
    const res = await gs.renderPDFPagesToPNG(files['pdf2.pdf'], 2, 2);
    expect(res.length).toBe(1);
  });

  test('works for the last two pages of a PDF', async () => {
    const res = await gs.renderPDFPagesToPNG(files['pdf2.pdf'], -2);
    expect(res.length).toBe(2);
  });

  test('fails when first page is 0', async () => {
    await expect(gs.renderPDFPagesToPNG(files['pdf1.pdf'], 0)).rejects.toThrow('First page number out of range: 0');
  });

  test('fails when last page is out of range', async () => {
    await expect(gs.renderPDFPagesToPNG(files['pdf1.pdf'], undefined, 3)).rejects.toThrow(
      'Last page number out of range: 3',
    );
  });

  test('fails when last page number is given when first page number is negative', async () => {
    await expect(gs.renderPDFPagesToPNG(files['pdf1.pdf'], -1, 2)).rejects.toThrow(
      'Last page must be undefined when first page is negative',
    );
  });

  test('fails for invalid PDF', async () => {
    await expect(gs.renderPDFPagesToPNG(Buffer.from([1, 2, 3]))).rejects.toThrow(
      /^Failed to determine number of pages in PDF: Command failed/,
    );
  });

  test('correctly renders rotated PDF', async () => {
    const rotatedPdf = await gs.rotatePDF(files['pdf1.pdf'], '90');
    const png = (await gs.renderPDFPagesToPNG(rotatedPdf))[0];
    expect([
      files['renderPDFPagesToPNG-rotated-output.png'].toString('base64'),
      files['renderPDFPagesToPNG-rotated-output2.png'].toString('base64'),
    ]).toContain(png.toString('base64'));
  });
});

describe('isValidPDF', () => {
  test('returns true for valid PDF', async () => {
    expect(await gs.isValidPDF(files['pdf1.pdf'])).toBe(true);
  });

  test('returns true for another valid PDF', async () => {
    expect(await gs.isValidPDF(files['pdf3.pdf'])).toBe(true);
  });

  test('returns true for PDF that has been extracted and combined again', async () => {
    const page = await gs.extractPDFPages(files['pdf3.pdf'], 1, 1);
    const pdf = await gs.combinePDFs([page]);
    expect(await gs.isValidPDF(pdf)).toBe(true);
  });

  test('returns false for invalid PDF', async () => {
    expect(await gs.isValidPDF(Buffer.from([1, 2, 3]))).toBe(false);
  });
});

import childProcess from 'child_process';
import fs from 'fs-extra';
import tempy, { FileOptions } from 'tempy';
import util from 'util';

const exec = util.promisify(childProcess.exec);

interface TempFilenameSetDefs {
  [setName: string]: {
    writeBuffers?: Buffer[];
    numFiles?: number;
    tempyConfig?: FileOptions;
  };
}

type TempFilenameSets = {
  [setName: string]: string[];
};

type TempFileFnSingle<T> = (input: string, output?: string) => Promise<T>;
type TempFileFnMany<T> = (filenames: TempFilenameSets) => Promise<T>;

async function useTempFiles<T>(filenameSets: TempFilenameSetDefs, fn: TempFileFnMany<T>) {
  const filenames: TempFilenameSets = {};

  // create all desired temporary files (either empty files or write data buffers to them)
  for (const [k, config] of Object.entries(filenameSets)) {
    const { numFiles, writeBuffers, tempyConfig } = config;

    if (numFiles !== undefined) {
      filenames[k] = Array(numFiles)
        .fill(0)
        .map(() => tempy.file(tempyConfig));
    } else if (writeBuffers !== undefined) {
      filenames[k] = await Promise.all(writeBuffers.map(b => tempy.write(b, tempyConfig)));
    }
  }

  // execute the worker function which uses these files
  const ret = await fn(filenames);

  // remove all the temporary files again
  await Promise.all([].concat(...(<any>Object.values(filenames))).map(f => fs.unlink(f)));

  // return the result of the worker function
  return ret;
}

async function useTempFilesPDF<T>(filenameSets: TempFilenameSetDefs, fn: TempFileFnMany<T>) {
  Object.values(filenameSets).forEach(v => (v.tempyConfig = { extension: '.pdf' }));
  return useTempFiles(filenameSets, fn);
}

// writes inputBuffer to one temporary file, creates an empty output file, calls the worker function and returns the output file contents as Buffer
async function useTempFilesPDFInOut(inputBuffer: Buffer, fn: TempFileFnSingle<void>): Promise<Buffer> {
  return useTempFilesPDF(
    { input: { writeBuffers: [inputBuffer] }, output: { numFiles: 1 } },
    async ({ input, output }) => {
      await fn(input[0], output[0]);
      return fs.readFile(output[0]);
    },
  );
}

async function useTempFilesPDFIn<T>(inputBuffer: Buffer, fn: TempFileFnSingle<T>): Promise<T> {
  return useTempFilesPDF({ input: { writeBuffers: [inputBuffer] } }, async ({ input }) => fn(input[0]));
}

export async function combinePDFs(pdfBuffers: Buffer[]): Promise<Buffer> {
  if (pdfBuffers.length === 0) return Buffer.alloc(0);
  if (pdfBuffers.length === 1) return pdfBuffers[0];

  try {
    return await useTempFilesPDF(
      { inputs: { writeBuffers: pdfBuffers }, output: { numFiles: 1 } },
      async ({ inputs, output }) => {
        await exec(
          `gs -q -dNOPAUSE -sDEVICE=pdfwrite -sOUTPUTFILE=${output[0]} -dBATCH -dAutoRotatePages=/None ${inputs.join(
            ' ',
          )} -c "[ /Creator () /Producer () /DOCINFO pdfmark"`,
        );
        return fs.readFile(output[0]);
      },
    );
  } catch (e: any) {
    throw new Error('Failed to combine PDFs: ' + e.message);
  }
}

export async function countPDFPages(pdfBuffer: Buffer): Promise<number> {
  try {
    return await useTempFilesPDFIn<number>(pdfBuffer, async input => {
      const escapedInput = input.replace(/\\/g, '\\\\');
      let { stdout } = await exec(
        `gs -q -dNOPAUSE -dBATCH -dNOSAFER -dNODISPLAY -c "(${escapedInput}) (r) file runpdfbegin pdfpagecount = quit"`,
      );

      /**
       * Necessary for when Ghostscript detects a damaged but repairable PDF file, because then it outputs
       * the following before the number of pages (three spaces before each line starting with "****"):
       *
       *    **** Error:  An error occurred while reading an XREF table.
       *    **** The file has been damaged.  This may have been caused
       *    **** by a problem while converting or transfering the file.
       *    **** Ghostscript will attempt to recover the data.
       *    **** However, the output may be incorrect.
       */
      stdout = stdout
        .split('\n')
        .filter(l => !l.startsWith('   **** ') && l.length > 0)
        .join('\n')
        .trim();

      const ret = parseInt(stdout);
      if (isNaN(ret)) throw new Error('parsing failed: ' + stdout);
      return ret;
    });
  } catch (e: any) {
    throw new Error('Failed to determine number of pages in PDF: ' + e.message);
  }
}

export async function extractPDFPages(pdfBuffer: Buffer, firstPage: number, lastPage: number): Promise<Buffer> {
  try {
    return await useTempFilesPDFInOut(pdfBuffer, async (input, output) => {
      await exec(
        `gs -q -dNOPAUSE -sDEVICE=pdfwrite -dBATCH -dNOSAFER -dFirstPage=${firstPage} -dLastPage=${lastPage} -dAutoRotatePages=/None -sOutputFile=${output} ${input}`,
      );
    });
  } catch (e: any) {
    throw new Error('Failed to extract PDF pages: ' + e.message);
  }
}

export async function rotatePDF(pdfBuffer: Buffer, direction: '90' | '180' | '270'): Promise<Buffer> {
  if (!['90', '180', '270'].includes(direction)) throw new Error('Invalid rotation direction: ' + direction);

  try {
    return await useTempFilesPDFInOut(pdfBuffer, async (input, output) => {
      await exec(`qpdf ${input} ${output} --rotate=${direction}`);
    });
  } catch (e: any) {
    throw new Error('Failed to rotate PDF: ' + e.message);
  }
}

/**
 * If `firstPage` is not given, 1 is used.
 * If `lastPage` is not given, the document's last page is used.
 * If `firstPage` is negative (e.g. -n), this refers to the last n pages and `lastPage` must be undefined.
 * All page numbers start at 1.
 */
export async function renderPDFPagesToPNG(
  pdfBuffer: Buffer,
  firstPage?: number,
  lastPage?: number,
  resolution = 300,
): Promise<Buffer[]> {
  const numPages = await countPDFPages(pdfBuffer);

  if (firstPage === undefined) firstPage = 1;
  else if (firstPage === 0 || (firstPage < 0 && firstPage < -numPages))
    throw new Error('First page number out of range: ' + firstPage);

  if (firstPage < 0) {
    if (lastPage !== undefined) throw new Error('Last page must be undefined when first page is negative');
    firstPage = numPages + firstPage + 1;
    lastPage = numPages;
  }

  if (lastPage === undefined) lastPage = numPages;
  else if (lastPage > numPages) throw new Error('Last page number out of range: ' + lastPage);

  if (firstPage! > lastPage!) throw new Error('Invalid page range: ' + firstPage + '-' + lastPage);

  try {
    return await useTempFilesPDFIn(pdfBuffer, async input => {
      const outDir = tempy.directory();
      await exec(
        `gs -q -dQUIET -dSAFER -dBATCH -dNOPAUSE -dNOPROMPT -dMaxBitmap=500000000 -dAlignToPixels=0 -dGridFitTT=2 -sDEVICE=png16m -dTextAlphaBits=4 -dGraphicsAlphaBits=4 -r${resolution} -sOutputFile=${outDir}/%d.png -dFirstPage=${firstPage} -dLastPage=${lastPage} ${input}`,
      );

      const outFiles = [];
      for (let i = 1; i <= lastPage! - firstPage! + 1; i++) {
        outFiles.push(await fs.readFile(outDir + '/' + i + '.png'));
      }

      await fs.rmdir(outDir, { recursive: true });
      return outFiles;
    });
  } catch (e: any) {
    throw new Error('Failed to render PDF pages to PNG: ' + e.message);
  }
}

export async function isValidPDF(pdfBuffer: Buffer): Promise<boolean> {
  try {
    await countPDFPages(pdfBuffer);
    return true;
  } catch (e) {
    return false;
  }
}

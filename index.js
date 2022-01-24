const childProcess = require('child_process');
const fs = require('fs-extra');
const tempy = require('tempy');
const util = require('util');
const exec = util.promisify(childProcess.exec);

async function useTempFiles(filenameSets, fn) {
  const filenames = {};

  // create all desired temporary files (either empty files or write data buffers to them)
  for (const [k, config] of Object.entries(filenameSets)) {
    const { numFiles, writeBuffers, ...tempyConfig } = config;

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
  await Promise.all([].concat(...Object.values(filenames)).map(f => fs.unlink(f)));

  // return the result of the worker function
  return ret;
}

async function useTempFilesPDF(filenameSets, fn) {
  Object.values(filenameSets).forEach(v => (v.extension = '.pdf'));
  return useTempFiles(filenameSets, fn);
}

// writes inputBuffer to one temporary file, creates an empty output file and eventually returns output
async function useTempFilesPDFInOut(inputBuffer, fn) {
  return useTempFilesPDF(
    { input: { writeBuffers: [inputBuffer] }, output: { numFiles: 1 } },
    async ({ input, output }) => {
      await fn(input[0], output[0]);
      return await fs.readFile(output[0]);
    },
  );
}

async function useTempFilesPDFIn(inputBuffer, fn) {
  return useTempFilesPDF({ input: { writeBuffers: [inputBuffer] } }, async ({ input }) => fn(input[0]));
}

async function combinePDFs(pdfBuffers) {
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
        return await fs.readFile(output[0]);
      },
    );
  } catch (e) {
    throw new Error('Failed to combine PDFs: ' + e.message);
  }
}

async function countPDFPages(pdfBuffer) {
  try {
    return await useTempFilesPDFIn(pdfBuffer, async input => {
      const { stdout } = await exec(
        `gs -q -dNOPAUSE -dBATCH -dNOSAFER -dNODISPLAY -c "(${input}) (r) file runpdfbegin pdfpagecount = quit"`,
      );
      return parseInt(stdout);
    });
  } catch (e) {
    throw new Error('Failed to determine number of pages in PDF: ' + e.message);
  }
}

async function extractPDFPages(pdfBuffer, firstPage, lastPage) {
  try {
    return await useTempFilesPDFInOut(pdfBuffer, async (input, output) => {
      await exec(
        `gs -q -dNOPAUSE -sDEVICE=pdfwrite -dBATCH -dNOSAFER -dFirstPage=${firstPage} -dLastPage=${lastPage} -dAutoRotatePages=/None -sOutputFile=${output} ${input}`,
      );
    });
  } catch (e) {
    throw new Error('Failed to extract PDF pages: ' + e.message);
  }
}

async function rotatePDF(pdfBuffer, direction) {
  if (!['90', '180', '270'].includes(direction)) throw new Error('Invalid rotation direction: ' + direction);

  try {
    return await useTempFilesPDFInOut(pdfBuffer, async (input, output) => {
      await exec(`qpdf ${input} ${output} --rotate=${direction}`);
    });
  } catch (e) {
    throw new Error('Failed to rotate PDF: ' + e.message);
  }
}

/**
 * If `firstPage` is not given, 1 is used.
 * If `lastPage` is not given, the document's last page is used.
 * If `firstPage` is negative (e.g. -n), this refers to the last n pages and `lastPage` must be undefined.
 * All page numbers start at 1.
 */
async function renderPDFPagesToPNG(pdfBuffer, firstPage, lastPage, resolution = 300) {
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

  if (firstPage > lastPage) throw new Error('Invalid page range: ' + firstPage + '-' + lastPage);

  try {
    return await useTempFilesPDFIn(pdfBuffer, async input => {
      const outDir = tempy.directory();
      await exec(
        `gs -q -dQUIET -dSAFER -dBATCH -dNOPAUSE -dNOPROMPT -dMaxBitmap=500000000 -dAlignToPixels=0 -dGridFitTT=2 -sDEVICE=png16m -dTextAlphaBits=4 -dGraphicsAlphaBits=4 -r${resolution} -sOutputFile=${outDir}/%d.png -dFirstPage=${firstPage} -dLastPage=${lastPage} ${input}`,
      );

      const outFiles = [];
      for (let i = 1; i <= lastPage - firstPage + 1; i++) {
        outFiles.push(await fs.readFile(outDir + '/' + i + '.png'));
      }

      await fs.rmdir(outDir, { recursive: true });
      return outFiles;
    });
  } catch (e) {
    throw new Error('Failed to render PDF pages to PNG: ' + e.message);
  }
}

async function isValidPDF(pdfBuffer) {
  try {
    await countPDFPages(pdfBuffer);
    return true;
  } catch (e) {
    return false;
  }
}

module.exports = {
  combinePDFs,
  countPDFPages,
  extractPDFPages,
  rotatePDF,
  renderPDFPagesToPNG,
  isValidPDF,
};

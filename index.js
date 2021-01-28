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
          `gs -q -dNOPAUSE -sDEVICE=pdfwrite -sOUTPUTFILE=${output[0]} -dBATCH ${inputs.join(
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
        `gs -q -dNOPAUSE -sDEVICE=pdfwrite -dBATCH -dNOSAFER -dFirstPage=${firstPage} -dLastPage=${lastPage} -sOutputFile=${output} ${input}`,
      );
    });
  } catch (e) {
    throw new Error('Failed to extract PDF pages: ' + e.message);
  }
}

async function rotatePDF(pdfBuffer, direction) {
  if (!['east', 'south', 'west'].includes(direction)) throw new Error('Invalid rotation direction: ' + direction);

  try {
    return await useTempFilesPDFInOut(pdfBuffer, async (input, output) => {
      await exec(`pdftk ${input} cat 1-end${direction} output ${output}`);
    });
  } catch (e) {}
}

module.exports = {
  combinePDFs,
  countPDFPages,
  extractPDFPages,
  rotatePDF,
};

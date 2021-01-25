const childProcess = require('child_process');
const fs = require('fs-extra');
const tempy = require('tempy');
const util = require('util');
const exec = util.promisify(childProcess.exec);

async function combinePDFs(pdfBuffers) {
  if (pdfBuffers.length === 0) return Buffer.alloc(0);
  if (pdfBuffers.length === 1) return pdfBuffers[0];

  try {
    // write all buffers to temporary files
    const outputFilename = tempy.file({ extension: '.pdf' });
    const pdfFilenames = await Promise.all(pdfBuffers.map(b => tempy.write(b, { extension: '.pdf' })));

    // also wipe "Ghostscript" from meta data (see https://unix.stackexchange.com/a/491435 )
    await exec(
      `gs -q -dNOPAUSE -sDEVICE=pdfwrite -sOUTPUTFILE=${outputFilename} -dBATCH ${pdfFilenames.join(
        ' ',
      )} -c "[ /Creator () /Producer () /DOCINFO pdfmark"`,
    );

    // remove all the temporary files again
    const ret = await fs.readFile(outputFilename);
    await Promise.all([fs.unlink(outputFilename), ...pdfFilenames.map(f => fs.unlink(f))]);

    return ret;
  } catch (e) {
    throw new Error('Failed to combine PDFs: ' + e.message);
  }
}

async function countPDFPages(pdfBuffer) {
  try {
    const filename = await tempy.write(pdfBuffer, { extension: '.pdf' });
    const { stdout } = await exec(
      `gs -q -dNOPAUSE -dBATCH -dNOSAFER -dNODISPLAY -c "(${filename}) (r) file runpdfbegin pdfpagecount = quit"`,
    );
    return parseInt(stdout);
  } catch (e) {
    throw new Error('Failed to determine number of pages in PDF: ' + e.message);
  }
}

async function extractPDFPages(pdfBuffer, firstPage, lastPage) {
  try {
    const outputFilename = tempy.file({ extension: '.pdf' });
    const inputFilename = await tempy.write(pdfBuffer, { extension: '.pdf' });

    await exec(
      `gs -q -dNOPAUSE -sDEVICE=pdfwrite -dBATCH -dNOSAFER -dFirstPage=${firstPage} -dLastPage=${lastPage} -sOutputFile=${outputFilename} ${inputFilename}`,
    );

    const ret = await fs.readFile(outputFilename);
    await fs.unlink(outputFilename);
    await fs.unlink(inputFilename);

    return ret;
  } catch (e) {
    throw new Error('Failed to extract PDF pages: ' + e.message);
  }
}

module.exports = {
  combinePDFs,
  countPDFPages,
  extractPDFPages,
};

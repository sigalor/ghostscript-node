# ghostscript-node

[![GitHub license](https://img.shields.io/github/license/sigalor/ghostscript-node)](https://github.com/sigalor/ghostscript-node/blob/master/LICENSE) [![npm](https://img.shields.io/npm/v/ghostscript-node)](https://www.npmjs.com/package/ghostscript-node) [![Unit tests workflow status](https://github.com/sigalor/ghostscript-node/actions/workflows/tests.yaml/badge.svg)](https://github.com/sigalor/ghostscript-node/actions/workflows/tests.yaml)

## Introduction

A fully promise-based Node.js library which can work with PDFs, based on Ghostscript and qpdf.

All PDF files that are handled by this library in the form of `Buffer` objects, i.e. to a user of this library, it looks like everything works only in memory. In the background though, file system access (via [tempy](https://www.npmjs.com/package/tempy)) is needed.

Additionally, this library requires the `gs` command (Ghostscript) as well as `qpdf` to be available. The required apt dependencies on Ubuntu 20.04 can be installed via the following command:

```
sudo apt install -y python python3 build-essential ghostscript libjpeg-dev libpng-dev libcurl4-openssl-dev mupdf-tools libfreetype6-dev qpdf
```

## Getting started

```
npm install ghostscript-node
```

## Usage

```javascript
const gs = require("ghostscript-node");

(async () => {
  const pdf1 = /* load first PDF as Buffer, e.g. from database */;
  const pdf2 = /* load second PDF as Buffer, e.g. from database */;

  // get Buffer object with bytes of combined PDF
  const combinedPDF = await gs.combinePDFs([pdf1, pdf2]);

  // get number of pages of pdf1
  const numPagesPDF1 = await gs.countPDFPages(pdf1);

  // get Buffer object with bytes of specified set of pages
  // page numbers begin with 1, last page is included
  const partOfPDF1 = await gs.extractPDFPages(pdf1, 3, 5);

  // rotate all pages of pdf1 by 90 degrees clockwise
  const rotatedPDF = await gs.rotatePDF(pdf1, "90");

  // returns an array of buffers containing PNG images of the desired pages
  const renderedPages = await gs.renderPDFPagesToPNG(pdf1);

  // checks if pdf1 is a valid PDF file
  const isPDF1Valid = await gs.isValidPDF(pdf1);
})();
```

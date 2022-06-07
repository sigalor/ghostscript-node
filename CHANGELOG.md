# 1.4.0 (2022-06-07)

- transformed entire library to use TypeScript
- fix `countPDFPages` to ignore Ghostscript warnings (e.g. due to a damaged XREF table)

# 1.3.2 (2022-02-16)

- escape input in countPDFPages for Windows, fix redundant await (Loupi) [#2](https://github.com/sigalor/ghostscript-node/pull/2)

# 1.3.1 (2022-01-24)

- fix handling of rotated PDFs
- improve internal structure of unit tests

# 1.3.0 (2022-01-06)

- added `isValidPDF` function

# 1.2.0 (2021-07-27)

- added `renderPDFPagesToPNG` function

# 1.1.2 (2021-01-28)

- use qpdf instead of PDFtk for rotating PDFs

# 1.1.1 (2021-01-28)

- fix TypeScript definition file

# 1.1.0 (2021-01-28)

- added `rotatePDF` function, based on PDFtk

# 1.0.0 (2021-01-25)

- initial release

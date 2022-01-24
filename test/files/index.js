const fs = require('fs-extra');
const path = require('path');

module.exports = async () => {
  const fileNames = (await fs.readdir(__dirname)).filter(f => f !== 'index.js');
  const files = {};

  for (let fileName of fileNames) {
    files[fileName] = await fs.readFile(path.join(__dirname, fileName));
  }

  return files;
};

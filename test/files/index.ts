import fs from 'fs-extra';
import path from 'path';

export type FilesMap = { [filename: string]: Buffer };

export async function getFiles(): Promise<FilesMap> {
  const fileNames: string[] = (await fs.readdir(__dirname)).filter(f => f !== 'index.js');
  const files: FilesMap = {};

  for (let fileName of fileNames) {
    files[fileName] = await fs.readFile(path.join(__dirname, fileName));
  }

  return files;
}

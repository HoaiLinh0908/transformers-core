import fs from 'fs';
import { findFileRecursively } from '../utils/file.utils';
import xml2js from 'xml-js';

export class BrowseInput {
  constructor(
    public readonly inputFolder: string,
  ) {}

  public async getProjectInfo() {
    console.log(`Browsing folder: ${this.inputFolder}`);
    const pomPath = await findFileRecursively(this.inputFolder, 'pom.xml');
    if (!pomPath) {
      console.error('No pom.xml found in the project');
      return;
    }
    const content = fs.readFileSync(pomPath, 'utf-8');
    const options = { compact: true, ignoreComment: true };
    const result = xml2js.xml2js(content, options);

    return {
      name: (result as any).project.artifactId._text,
      version: (result as any).project.version._text
    };
  }
}
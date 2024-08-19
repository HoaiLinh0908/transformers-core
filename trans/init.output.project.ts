import fs from 'fs';
import path from 'path';

export class InitializeOutputProject {
  constructor(
    public readonly outputFolder: string,
    public readonly projectName: string,
    public readonly projectVersion: string,
  ) {}

  public async initNodeJsProject() {
    console.log(`Add 'package.json' for '${this.projectName}' in folder: ${this.outputFolder}`);
    // Create the project folder
    fs.mkdirSync(this.outputFolder, { recursive: true });

    // Create the pom.xml file
    const pathToPackageJson = path.join(this.outputFolder, 'package.json');
    const content = this.generatePackageJson({ name: this.projectName, version: this.projectVersion });
    fs.writeFileSync(pathToPackageJson, content, 'utf-8');
  }

  public async initTypescriptProject() {
    console.log(`Add 'tsconfig.json' for '${this.projectName}' in folder: ${this.outputFolder}`);
    // Create the project folder
    fs.mkdirSync(this.outputFolder, { recursive: true });

    // Create the pom.xml file
    const pathToTsconfig = path.join(this.outputFolder, 'tsconfig.json');
    const content = this.generateTsconfigJson();
    fs.writeFileSync(pathToTsconfig, content, 'utf-8');
  }

  public async createPlaywrightConfig() {
    console.log(`Add 'playwright.config.ts' for '${this.projectName}' in folder: ${this.outputFolder}`);
    // Create the project folder
    fs.mkdirSync(this.outputFolder, { recursive: true });

    // Create the playwright.config.ts file
    const pathToPlaywrightConfig = path.join(this.outputFolder, 'playwright.config.ts');
    const content = this.generatePlaywrightConfig();
    fs.writeFileSync(pathToPlaywrightConfig, content, 'utf-8');
  }

  public async createSrcFolder() {
    console.log(`Create 'src' folder for '${this.projectName}' in folder: ${this.outputFolder}`);
    // Create the project folder
    fs.mkdirSync(this.outputFolder, { recursive: true });

    // Create the src folder
    const pathToSrc = path.join(this.outputFolder, 'src');
    fs.mkdirSync(pathToSrc, { recursive: true });
  }

  private generatePackageJson(info: { name: string, version: string }) {
    return `
      {
        "name": "${info.name}",
        "version": "${info.version}",
        "description": "",
        "main": "index.js",
        "scripts": {
        "test": "echo \\"Error: no test specified\\" && exit 1"
        },
        "keywords": [],
        "author": "",
        "license": "ISC",
        "devDependencies": {
          "@playwright/test": "^1.46.1",
          "@types/node": "^22.4.0",
          "typescript": "^5.5.4"
        }
      }
    `
  }

  private generateTsconfigJson() {
    return `
      {
        "compilerOptions": {
          "target": "es2016",
          "module": "commonjs",
          "esModuleInterop": true,
          "forceConsistentCasingInFileNames": true,
          "strict": true,
          "skipLibCheck": true,
          "noEmit": true
        }
      }
    `
  }

  private generatePlaywrightConfig() {
    return `
      import { defineConfig, devices } from '@playwright/test';
      
      export default defineConfig({
        testDir: './tests',
        fullyParallel: true,
        forbidOnly: !!process.env.CI,
        retries: process.env.CI ? 2 : 0,
        workers: process.env.CI ? 1 : undefined,
        reporter: 'html',
        use: {
          trace: 'on-first-retry',
        },
      
        projects: [
          {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
          },
      
          {
            name: 'firefox',
            use: { ...devices['Desktop Firefox'] },
          },
      
          {
            name: 'webkit',
            use: { ...devices['Desktop Safari'] },
          },
        ],
      });
    `
  }
}
import OpenAI from "openai";
import fs from 'fs';
import { findFilesBySearchTerm, findFilesRecursively } from "../utils/file.utils";
import path from "path";

export class MigrateTests {
  constructor(
    private readonly inputFolder: string,
    private readonly outputFolder: string,
    private readonly context: string,
    private readonly openai: OpenAI = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || 'tip-or-trick',
    })
  ) {
  }

  public async migrateTests() {
    const testOutputFolder = path.join(this.outputFolder, 'src/specs');
    console.log(`\nMigrating tests from '${this.inputFolder}' to '${testOutputFolder}'`);
    // Create the output folder
    fs.mkdirSync(testOutputFolder, { recursive: true });

    // Get test paths
    const testPaths = this.getJavaTests();

    // Add paths and contents to a map object
    let inputs = {} as {[key: string]: string};
    testPaths.forEach(async (test) => {
      inputs[test] = fs.readFileSync(test, 'utf-8');
    });
    const pageObjectPaths = findFilesBySearchTerm(this.outputFolder, 'Page.ts');
    const tsPageObjectContext = `\nAnd here are the paths of the above page object files:\n${pageObjectPaths.join('\n')}`;
    const specsFolderContext = `\nAnd here is the path where the converted tests will be stored:\n${testOutputFolder}\nPlease use these paths to import the page objects correctly.`;
    const contextMessage = `\nBelow are page object files that are used in the tests:\n${this.context}`;
    const userMessage = this.generateUserPrompt(inputs);

    const finalMessage = userMessage + contextMessage + tsPageObjectContext + specsFolderContext;
    console.log("\nGenerated user message:\n" + finalMessage);

    const response = await this.openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: [
              {
                type: "text",
                text: "You are going to receive some test files written in Java Selenium with TestNG as well as the paths to those files." +
                      "As a context to migrate tests, you also receive the content of page object files those tests used." +
                      "Convert the provided tests to an equivalent number of Playwright test files written in Typescript." +
                      "The response should not contains any human language word, just the code encloded inside ```typescript <code here> ``` for each converted file." +
                      "In the response, converted test files are separated by '---*---'.\n" + 
                      "Here are some rules you must obey when converting:\n" +

                      "1. Tests in Playwright are not written as classes so inheritence should be excluded and handled in another way.\n" +
                      "2. Unlike Selenium, Playwright can start and close the browser by itself without scripts from users. So you should omit these parts.\n" +
                      "3. Import the page objects correctly acoording to the page objects and test folder paths in the context.\n" +
                      "4. Use the Playwright built-in 'page' fixture instead of creating an object Page in the code.\n" +
                      "5. '@BeforeClass' equals to 'test.beforeAll()'. '@AfterClass' equals to 'test.afterAll()'. '@BeforeMethod' equals to 'test.beforeEach'. '@AfterMethod' equals to 'test.afterEach'.\n" +
                      "6. Converted tests should run independently, so try to use 'beforeEach' and 'afterEach' instead of 'beforeAll' or 'afterAll'.\n" +
                      "7. Do not import unsued objects or classed.\n" +
                      "8. Import from package '@playwright/test' instead of 'playwright'.\n" +
                      "9. Use the test from '@playwright/test'\n"
              }
          ]
        },
        {
          role: "user",
          content: finalMessage
        }
      ],
      temperature: 0,
      max_tokens: 2000,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
      response_format: {
        "type": "text"
      },
    });

    const openAIReponse = response.choices[0].message.content;
    console.log("\nOpenAI response:\n"+openAIReponse);
    if (!openAIReponse) {
      console.error('Failed to get response from OpenAI');
      return;
    }
    const convertedContent = openAIReponse.split('---*---');
    //Exclude empty files
    const finalTestsContent = convertedContent.filter(content => content.trim() !== '');

    // Write the converted content to the output folder
    finalTestsContent.forEach((content, index) => {
      console.log(index);
      const dest = path.join(testOutputFolder, path.basename(testPaths[index]).replace('.java', '.spec.ts'));
      console.log(`Writing to ${dest}`);
      try {
        const extracted = this.extractCode(content);
        fs.writeFileSync(dest, extracted, 'utf-8');
      } catch (err) {
        console.error(`Error writing to ${dest}: ${err}`);
      }
      console.log(`Test file '${testPaths[index]}' migrated to '${dest}'`);
    });
    console.log('Migration completed');
  }

  public generateUserPrompt(inputs: {[key: string]: string}) {
    let message = "Below are the paths and contents of test files written in Java Selenium using TestNG:\n";
    for (const key in inputs) {
      message += `Path: ${key}\nContent:\n ${inputs[key]}\n-------------------\n`;
    }
    return message;
  }

  public extractCode(input: string): string {
    const codeBlockRegex = /```typescript(.*?)```/s;
    const match = input.match(codeBlockRegex);
    return match ? match[1].trim() : '';
  }

  public getJavaTests() {
    return findFilesRecursively(this.inputFolder, 'resources');
  }
}

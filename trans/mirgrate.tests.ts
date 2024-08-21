import OpenAI from "openai";
import fs from 'fs';
import { findFilesRecursively } from "../utils/file.utils";
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
    console.log(`\nMigrating tests from '${this.inputFolder}' to '${this.outputFolder}'`);
    // Create the output folder
    fs.mkdirSync(this.outputFolder, { recursive: true });

    // Get test paths
    const testPaths = this.getJavaTests();

    // Add paths and contents to a map object
    let inputs = {} as {[key: string]: string};
    testPaths.forEach(async (test) => {
      inputs[test] = fs.readFileSync(test, 'utf-8');
    });
    const contextMessage = `Below are page object files that are used in the tests:\n${this.context}`;
    const userMessage = this.generateUserPrompt(inputs);

    const finalMessage = userMessage + contextMessage;
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
                      "In the response, converted test files are separated by '---*---'." + 
                      "\nHere are some rules you must obey when converting:\n" +
                      "1. Tests in Playwright are not written as classes so inheritence should be excluded and handled in another way.\n" +
                      "2. Unlike Selenium, Playwright can start and close the browser by itself without scripts from users. So you should omit these parts.\n" +
                      "3. Import the page objects from correct path.\n" +
                      "4. Use the test from '@playwright/test'\n" +
                      "5. '@BeforeClass' equals to 'test.beforeAll()'. '@AfterClass' equals to 'test.afterAll()'. '@BeforeMethod' equals to 'test.beforeEach'. '@AfterMethod' equals to 'test.afterEach'.\n" +
                      "6. Do not import unsued objects or classed.\n" +
                      "7. Import from package '@playwright/test' instead of 'playwright'.\n" +
                      "8. Make sure you converted all files.\n"
              }
          ]
        },
        {
          role: "user",
          content: finalMessage
        }
      ],
      temperature: 0.2,
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

    // Write the converted content to the output folder
    convertedContent.forEach((content, index) => {
      const dest = path.join(this.outputFolder, path.basename(testPaths[index]).replace('.java', '.ts'));
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

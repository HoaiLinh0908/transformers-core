import OpenAI from "openai";
import fs from 'fs';
import { findFilesBySearchTerm } from "../utils/file.utils";
import path from "path";

export class MigratePageObjects {
  constructor(
    private readonly inputFolder: string,
    private readonly outputFolder: string,
    private readonly openai: OpenAI = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || 'sk-',
    })
  ) {
  }

  public async migratePages() {
    console.log(`Migrating page objects from '${this.inputFolder}' to '${this.outputFolder}'`);
    // Create the output folder
    fs.mkdirSync(this.outputFolder, { recursive: true });

    // Get page objects paths
    const pageObjectPaths = this.getOriginalPageObjects();

    // Add paths and contents to a map object
    let inputs = {} as {[key: string]: string};
    pageObjectPaths.forEach(async (page) => {
      inputs[page] = fs.readFileSync(page, 'utf-8');
    });
    const userMessage = this.generateUserPrompt(inputs);
    console.log("\nGenerated user message:\n"+userMessage);

    const response = await this.openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: [
              {
                type: "text",
                text: "You are going to receive some page object file (Page Objec Model pattern) written in Java Selenium as well as the paths to those file." +
                      "Convert them to an equivalent number of Playwright page object files written in Typescript." +
                      "The response should not contains any human language word, just the code encloded inside ```typescript <code here> ``` for each converted file. Files are separated by '-------------------'." + 
                      "Here are some rules you must obey when converting:" + 
                      "1. Store the page object (Page from @playwright/test) as a protected property in the BasePage class so sub-classes can use it." +
                      "2. Do not import unsued objects or classed." +
                      "3. Import from package '@playwright/test' instead of 'playwright'."
              }
          ]
        },
        {
          role: "user",
          content: userMessage
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
    const convertedContent = openAIReponse.split('-------------------');

    // Write the converted content to the output folder
    convertedContent.forEach((content, index) => {
      const dest = path.join(this.outputFolder, path.basename(pageObjectPaths[index]).replace('.java', '.ts'));
      console.log(`Writing to ${dest}`);
      try {
        const extracted = this.extractCode(content);
        fs.writeFileSync(dest, extracted, 'utf-8');
      } catch (err) {
        console.error(`Error writing to ${dest}: ${err}`);
      }
      console.log(`Page object file '${pageObjectPaths[index]}' migrated to '${dest}'`);
    });
    console.log('Migration completed');
  }

  public generateUserPrompt(inputs: {[key: string]: string}) {
    let message = "Below are the paths and contents of page object files written in Java Selenium:\n";
    for (const key in inputs) {
      message += `Path: ${key}\nContent:\n ${inputs[key]}\n-------------------\n`;
    }
    return message;
  }

  public getOriginalPageObjects() {
    return findFilesBySearchTerm(this.inputFolder, 'Page.java', ".git\\", ".idea", "target", "\\test");
  }

  public extractCode(input: string): string {
    const codeBlockRegex = /```typescript(.*?)```/s;
    const match = input.match(codeBlockRegex);
    return match ? match[1].trim() : '';
  }
}

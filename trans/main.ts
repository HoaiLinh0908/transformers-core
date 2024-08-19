import { BrowseInput } from "./browse.input";
import { InitializeOutputProject } from "./init.output.project";
import { MigratePageObjects } from "./migrate.pages";

function browseInput(inputFolder: string) {
  const browseInput = new BrowseInput(inputFolder);
  browseInput.getProjectInfo().then(info => {
    console.log(info);
    const outputFolder = `../trans-${info?.name}`;
    const initProject = new InitializeOutputProject(outputFolder, info?.name, info?.version);
    initProject.initNodeJsProject();
    initProject.initTypescriptProject();
    initProject.createPlaywrightConfig();
    initProject.createSrcFolder();

    const pageObjectFolder = outputFolder + '/src/pages';
    const migratePages = new MigratePageObjects(inputFolder, pageObjectFolder);
    migratePages.migratePages();
  });
}

browseInput(process.env.INPUT_FOLDER || '');
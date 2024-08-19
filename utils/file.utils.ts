import fs from 'fs';
import path from 'path';

export function findFileRecursively(directory: string, filename: string): Promise<string | null> {
  return new Promise((resolve) => {
      fs.readdir(directory, { withFileTypes: true }, (err, entries) => {
          if (err) {
              console.error(`Error reading directory '${directory}': ${err.message}`);
              resolve(null);
              return;
          }

          const theFile = entries.find(entry => entry.isFile() && entry.name === filename);
          if (theFile) {
              resolve(path.join(directory, filename));
              return;
          }

          const folderEntries = entries.filter(entry => entry.isDirectory());
          for (const entry of folderEntries) {
              const entryPath = path.join(directory, entry.name);
              // Recursively search in the directory
              findFileRecursively(entryPath, filename).then(result => {
                  if (result) {
                    resolve(result); // Resolve with the found file path
                  }
              });
          }
      });
  });
}

export function findFilesBySearchTerm(searchDirectory: string, searchTerm: string, ...ignore: string[]) {
    const pages: string[] = [];
    function findFiles(directory: string) {
        if (ignore.some(i => directory.includes(i))) {
            return;
        }
        const kids = fs.readdirSync(directory);
        for(const kid of kids) {
            const filePath = path.join(directory, kid);
            const stats = fs.statSync(filePath);
            if (stats.isDirectory()) {
                findFiles(filePath);
            } else if (stats.isFile() && kid.includes(searchTerm)) {
                console.log(`Found file: ${filePath}`);
                pages.push(filePath);
            }
        }
    }
    findFiles(searchDirectory);
    return pages;
}
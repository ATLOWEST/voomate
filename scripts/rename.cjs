const fs = require('fs');
const path = require('path');

const rootDir = process.cwd();

// Directories to ignore
const ignoreDirs = new Set(['node_modules', '.git', 'dist', '.next', '.turbo', '.gemini']);

// Extensions to process
const validExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.html', '.css']);

function walkDir(dir, callback) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (ignoreDirs.has(file)) continue;

    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      walkDir(fullPath, callback);
    } else if (stat.isFile()) {
      const ext = path.extname(fullPath);
      if (validExtensions.has(ext) || file === 'package.json') {
        callback(fullPath);
      }
    }
  }
}

let changedCount = 0;

walkDir(rootDir, (filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // 1. Replace @soniq/ with @voomate/
  content = content.replace(/@soniq\//g, '@voomate/');

  // 2. Replace UI visible words Soniq with Voomate
  content = content.replace(/Soniq/g, 'Voomate');

  // 3. Optional: replace soniq (lowercase) if it is a standalone word or in comments,
  // but let's be careful not to break non-related things.
  // We'll explicitly replace any remaining 'soniq' to 'voomate' in json or ts files.
  content = content.replace(/\bsoniq\b/g, 'voomate');

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated: ${path.relative(rootDir, filePath)}`);
    changedCount++;
  }
});

console.log(`\nReplacement complete! Modified ${changedCount} files.`);

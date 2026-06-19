import * as fs from 'fs';
import * as path from 'path';

const rootFiles = [
  path.resolve(__dirname, '../PRD PipeVitta.md'),
  path.resolve(__dirname, '../DESIGN.md'),
  path.resolve(__dirname, '../CONVENTIONS.md'),
  path.resolve(__dirname, '../.env'),
  path.resolve(__dirname, '../docker-compose.yml')
];

rootFiles.forEach((filePath) => {
  if (!fs.existsSync(filePath)) {
    console.log(`File does not exist: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  let hasChanges = false;
  
  if (content.includes('@foo-new-ops/')) {
    content = content.replace(/@foo-new-ops\//g, '@pipevitta/');
    hasChanges = true;
  }
  if (content.includes('foonewops')) {
    content = content.replace(/foonewops/g, 'pipevitta');
    hasChanges = true;
  }
  if (content.includes('foo-new-ops')) {
    content = content.replace(/foo-new-ops/g, 'pipe-vitta');
    hasChanges = true;
  }
  if (content.includes('FooNewOps')) {
    content = content.replace(/FooNewOps/g, 'PipeVitta');
    hasChanges = true;
  }
  if (content.includes('FOONEWOPS')) {
    content = content.replace(/FOONEWOPS/g, 'PIPEVITTA');
    hasChanges = true;
  }
  
  if (hasChanges) {
    console.log(`Updating root file: ${filePath}`);
    fs.writeFileSync(filePath, content, 'utf8');
  }
});

console.log('✅ Root rebranding replacements complete!');

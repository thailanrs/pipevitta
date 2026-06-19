import * as fs from 'fs';
import * as path from 'path';

function walkDir(dir: string, callback: (filePath: string) => void) {
  fs.readdirSync(dir).forEach((f) => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      if (f !== 'node_modules' && f !== '.next' && f !== 'dist') {
        walkDir(dirPath, callback);
      }
    } else {
      callback(dirPath);
    }
  });
}

const targetDirs = [
  path.resolve(__dirname, '../apps/api/src'),
  path.resolve(__dirname, '../apps/api/test'),
  path.resolve(__dirname, '../apps/web-app/src'),
  path.resolve(__dirname, '../packages/database'),
  path.resolve(__dirname, '../packages/design-system')
];

targetDirs.forEach((dir) => {
  if (!fs.existsSync(dir)) return;
  
  walkDir(dir, (filePath) => {
    if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx') && !filePath.endsWith('.css') && !filePath.endsWith('.js') && !filePath.endsWith('.json') && !filePath.endsWith('.md')) {
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
      console.log(`Updating: ${filePath}`);
      fs.writeFileSync(filePath, content, 'utf8');
    }
  });
});

console.log('✅ Rebranding replacements complete!');

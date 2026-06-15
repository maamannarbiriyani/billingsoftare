const fs = require('fs');
const path = require('path');

const replacements = {
  'bg-white': 'bg-card',
  'bg-slate-50': 'bg-muted',
  'bg-slate-100': 'bg-muted/50',
  'bg-slate-200': 'bg-border',
  'text-slate-800': 'text-foreground',
  'text-slate-900': 'text-foreground',
  'text-slate-700': 'text-foreground/90',
  'text-slate-600': 'text-muted-foreground',
  'text-slate-500': 'text-muted-foreground',
  'text-slate-400': 'text-muted-foreground/80',
  'text-slate-300': 'text-muted-foreground/50',
  'border-slate-100': 'border-border/50',
  'border-slate-200': 'border-border',
  'border-slate-300': 'border-border/80',
  'hover:bg-slate-50': 'hover:bg-muted/80',
  'hover:bg-slate-100': 'hover:bg-muted',
  'hover:bg-slate-200': 'hover:bg-accent/80',
  'hover:border-slate-200': 'hover:border-border',
  'hover:text-slate-700': 'hover:text-foreground',
  'hover:text-slate-900': 'hover:text-foreground',
  'border-gray-200': 'border-border',
  'bg-gray-50': 'bg-muted',
  'text-gray-900': 'text-foreground',
  'text-gray-500': 'text-muted-foreground'
};

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // We only replace exact whole words to avoid accidentally matching something like `bg-white-500`
  for (const [search, replace] of Object.entries(replacements)) {
    // using word boundary or negative lookahead for hyphen to ensure exact tailwind class
    const regex = new RegExp(`\\b${search}(?![\\w-])`, 'g');
    content = content.replace(regex, replace);
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated: ${filePath}`);
    return true;
  }
  return false;
}

function walkDir(dir) {
  let updatedCount = 0;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      updatedCount += walkDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      if (processFile(fullPath)) updatedCount++;
    }
  }
  return updatedCount;
}

const targetDir = path.join(__dirname, 'src', 'app', '(protected)');
const count = walkDir(targetDir);
console.log(`Done! Updated ${count} files.`);

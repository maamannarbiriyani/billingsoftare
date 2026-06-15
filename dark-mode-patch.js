const fs = require('fs');
const path = require('path');

const files = [
  'src/components/BillingCart.tsx',
  'src/components/ProductForm.tsx',
  'src/components/Search.tsx',
  'src/app/(protected)/products/page.tsx',
];

const replacements = {
  'bg-white': 'bg-card',
  'bg-slate-50': 'bg-muted',
  'bg-slate-100': 'bg-secondary',
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
  'hover:bg-slate-100': 'hover:bg-accent',
  'hover:bg-slate-200': 'hover:bg-accent/80',
  'hover:border-slate-200': 'hover:border-border',
  'hover:text-slate-700': 'hover:text-foreground',
  'hover:text-slate-900': 'hover:text-foreground',
};

files.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) {
    console.log("File not found: " + filePath);
    return;
  }
  let content = fs.readFileSync(filePath, 'utf8');
  for (const [key, value] of Object.entries(replacements)) {
    // Replace whole words that match the tailwind classes
    const regex = new RegExp(`(?<=[\\s"'\\\`])` + key + `(?=[\\s"'\\\`])`, 'g');
    content = content.replace(regex, value);
  }
  fs.writeFileSync(filePath, content);
  console.log("Updated: " + file);
});
console.log("Done");

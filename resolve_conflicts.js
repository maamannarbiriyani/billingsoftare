const fs = require('fs');
const files = [
  'src/app/(protected)/dashboard/page.tsx',
  'src/app/(protected)/reports/page.tsx',
  'src/app/owner/(authenticated)/billing/page.tsx',
  'src/app/owner/(authenticated)/expenses/page.tsx'
];

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  // We want to keep the "Stashed changes" block, and remove the "Updated upstream" block.
  // The structure is:
  // <<<<<<< Updated upstream
  // [upstream block]
  // =======
  // [stash block]
  // >>>>>>> Stashed changes
  
  const resolved = content.replace(/<<<<<<< Updated upstream[\s\S]*?=======\n([\s\S]*?)>>>>>>> Stashed changes\n?/g, '$1');
  
  fs.writeFileSync(file, resolved, 'utf8');
  console.log(`Resolved ${file}`);
});

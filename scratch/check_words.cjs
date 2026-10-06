const fs = require('fs');
const path = require('path');

const words = [
  'immutable', 'cryptographic', 'forensic', 'syndicate',
  'certified', 'compliant', 'SOC', 'FINRA', 'zero-hallucination'
];

let matchCount = 0;

function scanDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const full = path.join(dir, file);
    if (fs.statSync(full).isDirectory()) {
      scanDir(full);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.css') || file.endsWith('.html')) {
      const content = fs.readFileSync(full, 'utf8');
      for (const w of words) {
        const regex = new RegExp(`\\b${w}\\b`, 'i');
        if (regex.test(content)) {
          console.log(`Match for "${w}" in ${full}`);
          matchCount++;
        }
      }
    }
  }
}

scanDir('./frontend/src');
console.log(`Scan complete. Total matches: ${matchCount}`);

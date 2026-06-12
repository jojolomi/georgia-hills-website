const fs = require('fs');
const path = require('path');

const distDir = path.resolve(process.argv[2] || 'astro-site/dist');
const mappingPath = path.resolve('astro-site/src/data/schema/keyword-entities.ar.json');

if (!fs.existsSync(distDir)) {
  console.error(`dist directory not found: ${distDir}`);
  process.exit(1);
}
if (!fs.existsSync(mappingPath)) {
  console.error(`keyword map not found: ${mappingPath}`);
  process.exit(1);
}

const mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
let passed = true;

for (const market of Object.keys(mapping)) {
  const htmlFile = path.join(distDir, `${market}.html`);
  if (!fs.existsSync(htmlFile)) {
    console.error(`✖ missing market page ${market}.html`);
    passed = false;
    continue;
  }

  const html = fs.readFileSync(htmlFile, 'utf8');
  const primary = String(mapping[market].primary || '').trim();
  if (primary) {
    const re = new RegExp(primary.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    if (!re.test(html)) {
      console.error(`✖ ${market}.html missing mapped primary keyword token: ${primary}`);
      passed = false;
    }
  }

  const entities = Array.isArray(mapping[market].entities) ? mapping[market].entities : [];
  if (entities.length) {
    const hasEntity = entities.some((token) => {
      const safe = String(token || '').trim();
      if (!safe) return false;
      const re = new RegExp(safe.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      return re.test(html);
    });
    if (!hasEntity) {
      console.error(`✖ ${market}.html missing any mapped entity token`);
      passed = false;
    }
  }
}

if (!passed) process.exit(1);
console.log('✔ keyword entity check passed for market pages');

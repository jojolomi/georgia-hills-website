const fs = require('fs');
const path = require('path');

const distDir = path.resolve(process.argv[2] || 'astro-site/dist');
const maxAssetKB = Number(process.env.GH_ASSET_BUDGET_KB || 800);
const maxPageKB = Number(process.env.GH_PAGE_BUDGET_KB || 1200);
let failOnBreach = process.env.GH_BUDGET_FAIL === '1';

function collectFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collectFiles(full, out);
    else out.push(full);
  }
  return out;
}

if (!fs.existsSync(distDir)) {
  console.error(`dist directory not found: ${distDir}`);
  process.exit(1);
}

const files = collectFiles(distDir);
const assets = files
  .filter((file) => !file.endsWith('.html'))
  .map((file) => ({ file, size: fs.statSync(file).size }))
  .sort((a, b) => b.size - a.size);

const pages = files
  .filter((file) => file.endsWith('.html'))
  .map((file) => ({ file, size: fs.statSync(file).size }))
  .sort((a, b) => b.size - a.size);

const topAssets = assets.slice(0, 10).map((item) => ({
  file: path.relative(distDir, item.file).replace(/\\/g, '/'),
  kb: Number((item.size / 1024).toFixed(1))
}));

const topPages = pages.slice(0, 10).map((item) => ({
  file: path.relative(distDir, item.file).replace(/\\/g, '/'),
  kb: Number((item.size / 1024).toFixed(1))
}));

const overAsset = topAssets.filter((item) => item.kb > maxAssetKB);
const overPages = topPages.filter((item) => item.kb > maxPageKB);

const report = {
  budgets: { maxAssetKB, maxPageKB, failOnBreach },
  topAssets,
  topPages,
  overAsset,
  overPages,
  generatedAt: new Date().toISOString()
};

const outPath = path.resolve('scripts/audit/perf/asset-budget-report.json');
fs.writeFileSync(outPath, JSON.stringify(report, null, 2));

if (overAsset.length || overPages.length) {
  console.warn('⚠ asset budget warning');
  console.warn(JSON.stringify({ overAsset, overPages }, null, 2));
  if (failOnBreach) process.exit(1);
}

console.log(`✔ asset budget report generated: ${outPath}`);

const fs = require("fs");
const path = require("path");

const distDir = path.resolve(process.argv[2] || "astro-site/dist");

function collectHtml(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectHtml(full, out);
      continue;
    }
    if (entry.name.endsWith(".html")) out.push(full);
  }
  return out;
}

function collectFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectFiles(full, out);
      continue;
    }
    out.push(full);
  }
  return out;
}

function shouldCheck(url) {
  if (!url) return false;
  if (/^(https?:)?\/\//i.test(url)) return false;
  if (/^(mailto:|tel:|javascript:|data:|#)/i.test(url)) return false;
  return true;
}

function resolveCandidates(ref) {
  const clean = ref.split("#")[0].split("?")[0].trim();
  if (!clean) return [];
  const normalized = clean.startsWith("/") ? clean.slice(1) : clean;
  const candidates = new Set();

  if (normalized === "") {
    candidates.add("index.html");
    return [...candidates];
  }

  candidates.add(normalized);
  if (!normalized.endsWith(".html") && !path.extname(normalized)) {
    candidates.add(`${normalized}.html`);
    candidates.add(path.join(normalized, "index.html").replace(/\\/g, "/"));
  }

  if (normalized.endsWith("/")) {
    candidates.add(`${normalized}index.html`);
    candidates.add(`${normalized.slice(0, -1)}.html`);
  }

  return [...candidates];
}

if (!fs.existsSync(distDir)) {
  process.stderr.write(`✖ dist directory not found: ${distDir}\n`);
  process.exit(1);
}

const existing = new Set(
  collectFiles(distDir).map((f) => path.relative(distDir, f).replace(/\\/g, "/"))
);

let passed = true;
const htmlFiles = collectHtml(distDir);

for (const file of htmlFiles) {
  const rel = path.relative(distDir, file).replace(/\\/g, "/");
  const html = fs.readFileSync(file, "utf8");

  const refs = [
    ...[...html.matchAll(/<a[^>]*\shref=["']([^"']+)["']/gi)].map((m) => m[1]),
    ...[...html.matchAll(/<link[^>]*\shref=["']([^"']+)["']/gi)].map((m) => m[1]),
    ...[...html.matchAll(/<script[^>]*\ssrc=["']([^"']+)["']/gi)].map((m) => m[1])
  ];

  for (const ref of refs) {
    if (!shouldCheck(ref)) continue;
    const candidates = resolveCandidates(ref);
    if (!candidates.length) continue;
    const found = candidates.some((c) => existing.has(c));
    if (!found) {
      process.stderr.write(`✖ ${rel}: broken internal reference ${ref}\n`);
      passed = false;
    }
  }
}

if (!passed) process.exit(1);
process.stdout.write(`✔ broken-link scan passed for ${htmlFiles.length} pages\n`);

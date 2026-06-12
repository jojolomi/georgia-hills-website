const fs = require("fs");
const path = require("path");

const root = process.cwd();

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function ok(message) {
  process.stdout.write(`✔ ${message}\n`);
}

function fail(message) {
  process.stderr.write(`✖ ${message}\n`);
}

function assert(condition, message) {
  if (!condition) {
    fail(message);
    return false;
  }
  ok(message);
  return true;
}

let passed = true;

try {
  const requiredFiles = [
    "package.json",
    "netlify.toml",
    "firebase.json",
    "firestore.rules",
    "firestore.indexes.json",
    "script.js",
    "index.html",
    "arabic.html",
    "honeymoon.html",
    "honeymoon-ar.html",
    "sitemap.xml",
    "robots.txt",
    "functions/index.js",
    "functions/package.json",
    "scripts/site-check.js"
  ];

  for (const file of requiredFiles) {
    passed = assert(fs.existsSync(path.join(root, file)), `${file} exists`) && passed;
  }

  const script = read("script.js");
  passed = assert(
    script.includes("window.__GH_FIREBASE_CONFIG") || script.includes("AIzaSy"),
    "script.js has active Firebase configuration path"
  ) && passed;

  const robots = read("robots.txt");
  passed = assert(robots.includes("https://georgiahills.com/sitemap.xml"), "robots points to georgiahills.com sitemap") && passed;

  const sitemap = read("sitemap.xml");
  passed = assert(!sitemap.includes("georgiahills.netlify.app"), "sitemap no longer points to netlify domain") && passed;

  const netlify = read("netlify.toml");
  passed = assert(netlify.includes("Content-Security-Policy"), "netlify headers include CSP") && passed;
  passed = assert(netlify.includes("cloudfunctions.net"), "CSP connect-src allows Cloud Functions") && passed;

  const services = read("services.html");
  passed = assert(services.includes("honeymoon.html"), "services.html links to honeymoon.html") && passed;

  const maybeHasNetlifyRef = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if ([".git", ".firebase", "node_modules", "scripts"].includes(entry.name)) continue;
        if (maybeHasNetlifyRef(full)) return true;
      } else if (/\.(html|xml|js|txt|md|toml)$/i.test(entry.name)) {
        const content = fs.readFileSync(full, "utf8");
        if (content.includes("georgiahills.netlify.app")) return true;
      }
    }
    return false;
  };

  passed = assert(!maybeHasNetlifyRef(root), "no netlify production URLs remain in source files") && passed;
} catch (error) {
  fail(`Validation failed unexpectedly: ${error.message}`);
  passed = false;
}

if (!passed) {
  process.exit(1);
}

import fs from "node:fs";
import path from "node:path";

const endpoint = process.env.CONTENTFUL_EXPORT_PATH || "";
const outPath = path.resolve("src/data/contentful-export.json");

if (!endpoint) {
  console.log("CONTENTFUL_EXPORT_PATH not set, skipping sync.");
  process.exit(0);
}

const sourcePath = path.resolve(endpoint);
if (!fs.existsSync(sourcePath)) {
  console.error(`Source export file not found: ${sourcePath}`);
  process.exit(1);
}

const raw = fs.readFileSync(sourcePath, "utf8");
const json = JSON.parse(raw);
fs.writeFileSync(outPath, JSON.stringify(json, null, 2));
console.log(`Contentful export synced: ${outPath}`);

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

if (!fs.existsSync(distDir)) {
  process.stderr.write(`✖ dist directory not found: ${distDir}\n`);
  process.exit(1);
}

let passed = true;
const files = collectHtml(distDir);
const destinationRouteRe = /(?:^|\/)(tbilisi|batumi|kazbegi|martvili|signagi(?:-ar)?)(?:\/index\.html|\.html)$/i;
const packageRouteRe = /(?:^|\/)(itineraries-hub|itineraries-hub-ar|honeymoon|honeymoon-ar|family-travel-hub|family-travel-hub-ar|halal-travel-hub|halal-travel-hub-ar|safety-hub|safety-hub-ar)(?:\/index\.html|\.html)$/i;

for (const file of files) {
  const html = fs.readFileSync(file, "utf8");
  const rel = path.relative(distDir, file).replace(/\\/g, "/");

  const scripts = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  if (!scripts.length) {
    process.stderr.write(`✖ ${rel}: missing JSON-LD schema\n`);
    passed = false;
    continue;
  }

  const routeTypes = new Set();
  for (const [index, match] of scripts.entries()) {
    const raw = (match[1] || "").trim();
    try {
      const parsed = JSON.parse(raw);
      if (!parsed["@context"]) {
        process.stderr.write(`✖ ${rel}: schema block ${index + 1} missing @context\n`);
        passed = false;
      }
      const graph = Array.isArray(parsed?.["@graph"]) ? parsed["@graph"] : [parsed];
      for (const node of graph) {
        if (node && typeof node === "object" && node["@type"]) {
          routeTypes.add(String(node["@type"]));
        }
      }
    } catch (error) {
      process.stderr.write(`✖ ${rel}: schema block ${index + 1} invalid JSON (${error.message})\n`);
      passed = false;
    }
  }

  if (destinationRouteRe.test(rel) && !routeTypes.has("TouristAttraction")) {
    process.stderr.write(`✖ ${rel}: destination page missing TouristAttraction schema\n`);
    passed = false;
  }

  if (packageRouteRe.test(rel) && !routeTypes.has("TouristTrip")) {
    process.stderr.write(`✖ ${rel}: package page missing TouristTrip schema\n`);
    passed = false;
  }
}

if (!passed) process.exit(1);
process.stdout.write(`✔ schema validation passed for ${files.length} pages\n`);

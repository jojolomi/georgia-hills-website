import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import admin from "firebase-admin";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const outFile = path.join(projectRoot, "src", "data", "cms-export.json");

function normalizeLocalized(input = {}) {
  return {
    en: String(input.en || "").trim(),
    ar: String(input.ar || "").trim()
  };
}

function toIsoMaybe(ts) {
  try {
    if (ts && typeof ts.toDate === "function") return ts.toDate().toISOString();
  } catch {}
  return "";
}

async function readCollection(db, name, mapper) {
  const snap = await db.collection(name).get();
  return snap.docs.map((doc) => mapper(doc.id, doc.data() || {}));
}

async function main() {
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || "";
  const projectId = process.env.FIREBASE_PROJECT_ID || "";

  if (!serviceAccountPath && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    throw new Error("Missing credentials. Set FIREBASE_SERVICE_ACCOUNT_PATH or GOOGLE_APPLICATION_CREDENTIALS.");
  }

  if (!admin.apps.length) {
    if (serviceAccountPath) {
      const raw = await fs.readFile(serviceAccountPath, "utf8");
      admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(raw)),
        projectId: projectId || undefined
      });
    } else {
      admin.initializeApp({ projectId: projectId || undefined });
    }
  }

  const db = admin.firestore();

  const [pages, destinations, articles] = await Promise.all([
    readCollection(db, "cms_pages", (id, data) => ({
      id,
      slug: String(data.slug || id),
      status: data.status === "published" ? "published" : "draft",
      title: normalizeLocalized(data.title || {}),
      description: normalizeLocalized(data.description || {}),
      body: normalizeLocalized(data.body || {}),
      updatedAt: toIsoMaybe(data.updatedAt)
    })),
    readCollection(db, "destinations", (id, data) => ({
      id,
      slug: String(data.slug || id),
      name: normalizeLocalized(data.name || { en: data.name_en, ar: data.name_ar }),
      summary: normalizeLocalized(data.summary || { en: data.summary_en, ar: data.summary_ar }),
      heroImage: String(data.heroImage || data.image || ""),
      updatedAt: toIsoMaybe(data.updatedAt)
    })),
    readCollection(db, "articles", (id, data) => ({
      id,
      slug: String(data.slug || id),
      title: normalizeLocalized(data.title || {}),
      excerpt: normalizeLocalized(data.excerpt || {}),
      content: normalizeLocalized(data.content || {}),
      coverImage: String(data.coverImage || data.image || ""),
      publishedAt: toIsoMaybe(data.publishedAt)
    }))
  ]);

  const payload = {
    generatedAt: new Date().toISOString(),
    pages,
    destinations,
    articles
  };

  await fs.writeFile(outFile, JSON.stringify(payload, null, 2), "utf8");
  process.stdout.write(`CMS snapshot written to ${outFile}\n`);
}

main().catch((error) => {
  process.stderr.write(`CMS sync failed: ${error.message}\n`);
  process.exit(1);
});

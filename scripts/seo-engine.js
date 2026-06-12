const fs = require('fs');
const path = require('path');

const root = process.cwd();
const siteUrl = 'https://georgiahills.com';
const sitemapPath = path.join(root, 'sitemap.xml');
const reportPath = path.join(root, 'scripts', 'seo-report.json');

const IMAGE_EXT = /\.(avif|webp|png|jpe?g|gif|svg)$/i;
const VIDEO_EXT = /\.(mp4|webm|ogg|m3u8)$/i;

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function toDateString(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

function normalizeLoc(relPath) {
  const clean = relPath.replace(/\\/g, '/').replace(/^\/+/, '');
  if (clean === 'index.html') return `${siteUrl}/`;
  if (clean.endsWith('/index.html')) return `${siteUrl}/${clean.replace(/\/index\.html$/i, '/')}`;
  return `${siteUrl}/${clean}`;
}

function toAbsoluteUrl(raw, pageLoc) {
  if (!raw) return null;
  const v = raw.trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  if (/^data:/i.test(v) || /^javascript:/i.test(v) || /^#/.test(v)) return null;
  try {
    return new URL(v, pageLoc).toString();
  } catch {
    return null;
  }
}

function counterpart(file) {
  if (file === 'index.html') return 'arabic.html';
  if (file === 'arabic.html') return 'index.html';
  if (/-ar\.html$/i.test(file)) return file.replace(/-ar\.html$/i, '.html');
  if (/\.html$/i.test(file)) return file.replace(/\.html$/i, '-ar.html');
  return null;
}

function extractImages(html, loc) {
  const out = new Set();
  const imgSrc = [...html.matchAll(/<img[^>]*\ssrc=["']([^"']+)["']/gi)].map(m => m[1]);
  const og = [...html.matchAll(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/gi)].map(m => m[1]);
  const preload = [...html.matchAll(/<link[^>]*as=["']image["'][^>]*href=["']([^"']+)["']/gi)].map(m => m[1]);
  const srcset = [...html.matchAll(/\ssrcset=["']([^"']+)["']/gi)].map(m => m[1]);

  [...imgSrc, ...og, ...preload].forEach((u) => {
    const abs = toAbsoluteUrl(u, loc);
    if (abs && IMAGE_EXT.test(abs) && abs.startsWith(siteUrl)) out.add(abs);
  });

  srcset.forEach((setStr) => {
    setStr.split(',').forEach((part) => {
      const [u] = part.trim().split(/\s+/);
      const abs = toAbsoluteUrl(u, loc);
      if (abs && IMAGE_EXT.test(abs) && abs.startsWith(siteUrl)) out.add(abs);
    });
  });

  return [...out].slice(0, 8);
}

function extractVideos(html, loc) {
  const out = new Set();
  const vids = [...html.matchAll(/<(?:video|source)[^>]*\ssrc=["']([^"']+)["']/gi)].map(m => m[1]);
  vids.forEach((u) => {
    const abs = toAbsoluteUrl(u, loc);
    if (abs && VIDEO_EXT.test(abs)) out.add(abs);
  });
  return [...out].slice(0, 3);
}

function canonicalFrom(html, fallbackLoc) {
  const m = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i);
  if (!m) return fallbackLoc;
  const val = m[1].trim();
  if (/^https?:\/\//i.test(val)) return val;
  return toAbsoluteUrl(val, fallbackLoc) || fallbackLoc;
}

function buildEntry(relPath) {
  const filePath = path.join(root, relPath);
  const html = read(filePath);
  const fallbackLoc = normalizeLoc(relPath);
  const loc = canonicalFrom(html, fallbackLoc);
  const stats = fs.statSync(filePath);
  const isArabic = /(^arabic\.html$|-ar\.html$|\/(sa|ae|qa|kw|eg)\/index\.html$)/i.test(relPath);

  const counterpartPath = counterpart(relPath);
  const hasCounterpart = counterpartPath && fs.existsSync(path.join(root, counterpartPath));

  const alternates = [
    `<xhtml:link rel="alternate" hreflang="en" href="${hasCounterpart && isArabic ? normalizeLoc(counterpartPath) : loc}" />`,
    `<xhtml:link rel="alternate" hreflang="ar" href="${hasCounterpart && !isArabic ? normalizeLoc(counterpartPath) : loc}" />`,
    `<xhtml:link rel="alternate" hreflang="x-default" href="${siteUrl}/" />`
  ];

  const images = extractImages(html, loc);
  const videos = extractVideos(html, loc);

  return {
    relPath,
    loc,
    lastmod: toDateString(stats.mtimeMs),
    priority: relPath === 'index.html' ? '1.0' : isArabic ? '0.9' : '0.8',
    alternates,
    images,
    videos
  };
}

function findHtmlFiles() {
  const out = [];
  function walk(dirRel) {
    const full = path.join(root, dirRel);
    for (const ent of fs.readdirSync(full, { withFileTypes: true })) {
      if (ent.name.startsWith('.')) continue;
      if (['node_modules', '.git', 'functions', 'scripts'].includes(ent.name)) continue;
      const rel = path.join(dirRel, ent.name);
      if (ent.isDirectory()) {
        walk(rel);
        continue;
      }
      if (!ent.name.endsWith('.html')) continue;
      if (/\.bak\.html$/i.test(ent.name)) continue;
      if (/^admin/i.test(ent.name)) continue;
      out.push(rel.replace(/\\/g, '/'));
    }
  }
  walk('');
  return out.sort();
}

function toUrlXml(entry) {
  const imageXml = entry.images.map((u) => `\n    <image:image><image:loc>${u}</image:loc></image:image>`).join('');
  const videoXml = entry.videos.map((u) => `\n    <video:video><video:content_loc>${u}</video:content_loc></video:video>`).join('');
  return `  <url>\n    <loc>${entry.loc}</loc>\n    ${entry.alternates.join('\n    ')}\n    <lastmod>${entry.lastmod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>${entry.priority}</priority>${imageXml}${videoXml}\n  </url>`;
}

function run() {
  const files = findHtmlFiles();
  const entries = files.map(buildEntry);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">\n${entries.map(toUrlXml).join('\n')}\n</urlset>\n`;

  fs.writeFileSync(sitemapPath, xml, 'utf8');

  const report = {
    generatedAt: new Date().toISOString(),
    totalUrls: entries.length,
    withImages: entries.filter(e => e.images.length > 0).length,
    withVideos: entries.filter(e => e.videos.length > 0).length,
    pages: entries.map(e => ({ file: e.relPath, loc: e.loc, images: e.images.length, videos: e.videos.length }))
  };
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

  console.log(`SEO engine completed. Generated ${entries.length} sitemap entries.`);
  console.log(`SEO report: ${path.relative(root, reportPath)}`);
}

try {
  run();
} catch (err) {
  console.error(`SEO engine failed: ${err.message}`);
  process.exit(1);
}

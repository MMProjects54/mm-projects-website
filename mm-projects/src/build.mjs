// Builds the website into the /public folder.  Run:  node src/build.mjs
// No packages to install: needs Node.js 18 or newer only.
import { readFile, writeFile, mkdir, rm, cp, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseTally } from './lib/html.mjs';
import { homePage, servicesPage, privacyPage, notFoundPage } from './pages.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public');
// Content lives in content/*.json (edited through the Pages CMS dashboard or by hand).
async function load(name) {
  const file = join(ROOT, 'content', name);
  const raw = await readFile(file, 'utf8');
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`content/${name} has a formatting mistake (often a missing comma or quote mark): ${err.message}`);
  }
}

// Tidy values saved by the dashboard: "/images/x.jpg" -> "images/x.jpg", missing lists -> [], numbers as numbers.
function tidy(value) {
  if (Array.isArray(value)) return value.map(tidy);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, tidy(v)]));
  if (typeof value === 'string' && /^\/images\//.test(value)) return value.slice(1);
  return value;
}
const list = (x) => (Array.isArray(x) ? x : []);
function normalise({ settings, text, services, projects, reviews, privacy }) {
  settings.business.areasCovered = list(settings.business.areasCovered).filter(Boolean);
  text.nav = list(text.nav);
  text.hero.highlights = list(text.hero.highlights).filter(Boolean);
  text.services.mobileShowCount = Number(text.services.mobileShowCount) || 4;
  text.about.paragraphs = list(text.about.paragraphs).filter(Boolean);
  text.about.points = list(text.about.points);
  text.quote.steps = list(text.quote.steps);
  text.footer.summary = list(text.footer.summary).filter(Boolean);
  services = list(services).map((s) => ({ ...s, includes: list(s.includes).filter(Boolean) }));
  projects.gallery = list(projects.gallery).filter((p) => p && p.image);
  projects.beforeAfter = list(projects.beforeAfter).filter((p) => p && p.before && p.after);
  reviews = list(reviews).filter((r) => r && r.text).map((r) => ({ ...r, rating: r.rating === '' || r.rating == null ? undefined : Number(r.rating) }));
  privacy.sections = list(privacy.sections).map((s) => ({ ...s, paragraphs: list(s.paragraphs).filter(Boolean), list: list(s.list).filter(Boolean), after: list(s.after).filter(Boolean) }));
  return { settings, text, services, projects, reviews, privacy };
}

// ---------------------------------------------------------------- image sizes
function exifOrientation(buf, tiff) {
  try {
    const le = buf.toString('ascii', tiff, tiff + 2) === 'II';
    const u16 = (o) => (le ? buf.readUInt16LE(o) : buf.readUInt16BE(o));
    const u32 = (o) => (le ? buf.readUInt32LE(o) : buf.readUInt32BE(o));
    const ifd = tiff + u32(tiff + 4);
    for (let n = u16(ifd), e = ifd + 2; n > 0; n--, e += 12) if (u16(e) === 0x0112) return u16(e + 8);
  } catch { /* ignore unreadable EXIF */ }
  return 1;
}

function imageSize(buf) {
  if (buf.readUInt32BE(0) === 0x89504e47) return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    let orientation = 1;
    while (i < buf.length) {
      if (buf[i] !== 0xff) { i++; continue; }
      const marker = buf[i + 1];
      const len = buf.readUInt16BE(i + 2);
      if (marker === 0xe1 && buf.toString('ascii', i + 4, i + 8) === 'Exif') orientation = exifOrientation(buf, i + 10);
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        const h = buf.readUInt16BE(i + 5), w = buf.readUInt16BE(i + 7);
        return orientation >= 5 ? { width: h, height: w } : { width: w, height: h }; // phone photos taken sideways
      }
      i += 2 + len;
    }
  }
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    const chunk = buf.toString('ascii', 12, 16);
    if (chunk === 'VP8X') return { width: 1 + buf.readUIntLE(24, 3), height: 1 + buf.readUIntLE(27, 3) };
    if (chunk === 'VP8 ') return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
    if (chunk === 'VP8L') { const b = buf.readUInt32LE(21); return { width: (b & 0x3fff) + 1, height: ((b >> 14) & 0x3fff) + 1 }; }
  }
  return null;
}

async function walk(dir, base = dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(p, base)));
    else out.push(p.slice(base.length + 1).split('\\').join('/'));
  }
  return out;
}

// ---------------------------------------------------------------- theme CSS from settings.brand
function themeCss(brand) {
  const vars = Object.entries(brand).map(([k, v]) => `  --${k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())}: ${v};`).join('\n');
  return `/* Generated from content/settings.json (brand colours). Do not edit here. */\n:root {\n${vars}\n}\n`;
}

async function build() {
  const started = Date.now();
  const loaded = await Promise.all(['settings.json', 'text.json', 'services.json', 'projects.json', 'reviews.json', 'privacy.json'].map(load));
  const { settings, text, services, projects, reviews, privacy } = normalise(tidy({
    settings: loaded[0], text: loaded[1], services: loaded[2], projects: loaded[3], reviews: loaded[4], privacy: loaded[5],
  }));
  const warnings = [];
  const errors = [];

  // ---- image sizes + missing-image check
  const imageSizes = {};
  for (const f of await walk(join(ROOT, 'images'))) {
    if (/\.(jpe?g|png|webp)$/i.test(f)) {
      const buf = await readFile(join(ROOT, 'images', f));
      const size = imageSize(buf);
      if (size) imageSizes[`images/${f}`] = size;
      if (buf.length > 1024 * 1024) warnings.push(`images/${f} is ${(buf.length / 1048576).toFixed(1)} MB. Photos under 1 MB load much faster (about 1600px wide is plenty).`);
    }
  }
  const referenced = [
    settings.logo.mark, text.hero.image, text.hero.imageMobile, text.about.image, text.siteVisit.image,
    ...services.map((s) => s.image),
    ...projects.gallery.map((p) => p.image),
    ...projects.beforeAfter.flatMap((p) => [p.before, p.after]),
  ].filter(Boolean);
  for (const src of referenced) if (!existsSync(join(ROOT, src))) errors.push(`Image not found: ${src} (check the file name and folder)`);

  // ---- helpful warnings
  if (!parseTally(settings.tally.enquiryForm)) warnings.push('Tally enquiry form not connected: the quote form shows a labelled preview. Add it under Business settings > Tally forms.');
  if (settings.tally.enquiryForm && !parseTally(settings.tally.enquiryForm)) errors.push(`tally.enquiryForm doesn't look like a Tally link: ${settings.tally.enquiryForm}`);
  if (settings.tally.siteVisitForm && !parseTally(settings.tally.siteVisitForm)) errors.push(`tally.siteVisitForm doesn't look like a Tally link: ${settings.tally.siteVisitForm}`);
  if (!settings.siteUrl) warnings.push('siteUrl is empty: no sitemap, canonical links or share image yet. Set it once your domain is live.');
  if (settings.siteUrl && /\/$/.test(settings.siteUrl)) settings.siteUrl = settings.siteUrl.replace(/\/+$/, '');
  if (!reviews.length) warnings.push('No reviews yet: the reviews section shows labelled placeholders.');
  const ph = projects.gallery.filter((p) => p.placeholder).length + projects.beforeAfter.filter((p) => p.placeholder).length;
  if (ph) warnings.push(`${ph} project image(s) are still placeholders (Project photos in the dashboard).`);
  const ids = new Set();
  for (const s of services) {
    if (!/^[a-z0-9-]+$/.test(s.id)) errors.push(`Service id "${s.id}" should be lowercase letters, numbers and hyphens only.`);
    if (ids.has(s.id)) errors.push(`Two services share the id "${s.id}".`);
    ids.add(s.id);
  }
  if (errors.length) {
    console.error('\nBuild stopped:\n' + errors.map((e) => `  ✗ ${e}`).join('\n') + '\n');
    process.exit(1);
  }

  // ---- assets
  const css = themeCss(settings.brand) + (await readFile(join(ROOT, 'src/styles/site.css'), 'utf8'));
  const js = await readFile(join(ROOT, 'src/scripts/site.js'), 'utf8');
  const version = createHash('sha1').update(css + js).digest('hex').slice(0, 8);

  await rm(OUT, { recursive: true, force: true });
  await mkdir(join(OUT, 'assets'), { recursive: true });
  await writeFile(join(OUT, 'assets/site.css'), css);
  await writeFile(join(OUT, 'assets/site.js'), js);
  await cp(join(ROOT, 'images'), join(OUT, 'images'), { recursive: true });
  await cp(join(ROOT, 'fonts'), join(OUT, 'fonts'), { recursive: true });
  await cp(join(ROOT, 'favicon.ico'), join(OUT, 'favicon.ico'));

  // ---- pages
  const base = { settings, text, services, projects, reviews, privacy, imageSizes, version };
  const make = (page) => ({
    ...base,
    page,
    home: page === 'home' ? '#top' : 'index.html',
    href: (anchor) => (page === 'home' ? anchor : anchor === '#top' ? 'index.html' : `index.html${anchor}`),
  });
  const pages = {
    'index.html': homePage(make('home')),
    'services.html': servicesPage(make('services')),
    'privacy.html': privacyPage(make('privacy')),
    '404.html': notFoundPage(make('404')),
  };
  for (const [file, html] of Object.entries(pages)) await writeFile(join(OUT, file), html.replace(/\n\s*\n/g, '\n'));

  // ---- site files
  await writeFile(join(OUT, 'site.webmanifest'), JSON.stringify({
    name: settings.business.name,
    short_name: settings.business.name,
    start_url: './',
    display: 'standalone',
    background_color: settings.brand.charcoal,
    theme_color: settings.brand.charcoal,
    icons: [
      { src: 'images/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: 'images/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  }, null, 2));
  const today = new Date().toISOString().slice(0, 10);
  await writeFile(join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\n${settings.siteUrl ? `\nSitemap: ${settings.siteUrl}/sitemap.xml\n` : ''}`);
  if (settings.siteUrl) {
    const urls = ['', 'services.html', 'privacy.html'];
    await writeFile(join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${settings.siteUrl}/${u}</loc><lastmod>${today}</lastmod></url>`).join('\n')}\n</urlset>\n`);
  }
  await writeFile(join(OUT, '_headers'), `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: SAMEORIGIN
  Permissions-Policy: camera=(), microphone=(), geolocation=()

/images/*
  Cache-Control: public, max-age=2592000

/fonts/*
  Cache-Control: public, max-age=31536000, immutable

/assets/*
  Cache-Control: public, max-age=31536000, immutable
`);

  // ---- report
  const files = await walk(OUT);
  let bytes = 0;
  for (const f of files) bytes += (await stat(join(OUT, f))).size;
  console.log(`\n✓ Built ${Object.keys(pages).length} pages, ${files.length} files (${(bytes / 1024).toFixed(0)} KB) into /public in ${Date.now() - started} ms`);
  if (warnings.length) console.log('\nTo do before launch:\n' + warnings.map((w) => `  • ${w}`).join('\n'));
  console.log('');
}

build().catch((err) => {
  console.error('\nBuild failed. This usually means a typo in one of the content files (a missing quote mark or comma).\n');
  console.error(err.message);
  process.exit(1);
});

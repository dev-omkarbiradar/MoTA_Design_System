// MoTA Design System build
// ---------------------------------------------------------------------------
// Rebuilds dist/ from src/. Needs Node.js 18 or later and nothing else (no
// npm install). Teams that only use the design system never need to run it:
// dist/ is committed and ready to copy.
//
//   node build.mjs
//
// Output
//   dist/css/mota-ds.css            all components (readable)
//   dist/css/mota-ds.min.css        same, minified (use in production)
//   dist/css/mota-ds-icons.css      core UI icons embedded as data URIs
//   dist/css/mota-ds-icons-all.css  every DBIM icon, loaded from dist/icons/
//   dist/icons/*.svg                every icon as an optimised SVG file
//   dist/js/mota-ds.js              behaviour script
//   docs/icons-data.js              icon list for the documentation page
// ---------------------------------------------------------------------------
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const src = (...p) => join(here, 'src', ...p);
const dist = (...p) => join(here, 'dist', ...p);
const pkg = JSON.parse(readFileSync(join(here, 'package.json'), 'utf8'));

for (const dir of ['css', 'js', 'icons']) mkdirSync(dist(dir), { recursive: true });
mkdirSync(join(here, 'docs'), { recursive: true });

const banner = `/*! MoTA Design System v${pkg.version} | Ministry of Tribal Affairs, Government of India | DBIM v3.0 · GIGW 3.0 · WCAG 2.1 AA */\n`;

// ---- CSS ----------------------------------------------------------------------
const cssFiles = readdirSync(src('css')).filter((f) => f.endsWith('.css')).sort();
const css = cssFiles.map((f) => `/* ---- ${f} ---- */\n` + readFileSync(src('css', f), 'utf8').trim()).join('\n\n');
writeFileSync(dist('css', 'mota-ds.css'), banner + css + '\n');
writeFileSync(dist('css', 'mota-ds.min.css'), banner + minifyCss(css) + '\n');

function minifyCss(input) {
  return input
    .replace(/\/\*[\s\S]*?\*\//g, '')       // comments
    .replace(/\s+/g, ' ')                    // collapse whitespace
    .replace(/\s*([{};,])\s*/g, '$1')        // around braces, semicolons, commas
    .replace(/:\s+/g, ':')                   // after colons (values, media features)
    .replace(/;}/g, '}')
    .trim();
}

// ---- Icons ---------------------------------------------------------------------
// The core set is embedded in mota-ds-icons.css, so it works everywhere,
// including pages opened from disk. Keep it to icons the components use.
const CORE = [
  // navigation and actions
  'home', 'search', 'menu', 'menu-close', 'close', 'chevron-left', 'chevron-right', 'chevron-down', 'chevron-up',
  'arrow-forward', 'arrow-left', 'arrow-right', 'arrow-up', 'arrow-downward', 'download', 'upload', 'open-in-new',
  'external-link', 'refresh', 'edit', 'delete', 'add', 'remove', 'check', 'check-circle', 'cancel', 'filter',
  'filter-off', 'sort-by', 'view', 'hide', 'share', 'more-vert-2', 'more-dots', 'list', 'sidebar', 'dashboard',
  'settings', 'preferences', 'notifications', 'login', 'logout', 'lock', 'account-circle', 'users', 'group-2', 'help', 'info',
  'warning', 'error', 'pause', 'play-2', 'attachment', 'pdf', 'documents', 'draft', 'reports', 'calendar',
  'due-date', 'start-date', 'call', 'email', 'address', 'location', 'site-map',
  // accessibility panel and language
  'accessibility', 'translate', 'text-size-increase', 'text-size-decrease', 'dark-contrast', 'saturation',
  'highlight-link', 'hide-image', 'default-cursor', 'invert',
  // common government content
  'announcements', 'whats-new', 'schemes', 'scholarship', 'tenders', 'vacancy', 'feedback', 'helpdesk',
  'directory', 'ministry', 'event', 'photo-gallery', 'video-gallery', 'security',
  // social
  'facebook', 'twitter', 'youtube', 'instagram', 'linkedin', 'whatsapp',
];

const titles = new Map();
const manifest = src('icons', 'MANIFEST.tsv');
if (existsSync(manifest)) {
  for (const line of readFileSync(manifest, 'utf8').split(/\r?\n/)) {
    const [file, title] = line.split('\t');
    if (file && title) titles.set(basename(file, '.svg'), title);
  }
}

const icons = new Map();
for (const dir of ['icons', 'icons-extra']) {
  for (const file of readdirSync(src(dir)).filter((f) => f.endsWith('.svg'))) {
    icons.set(basename(file, '.svg'), optimiseSvg(readFileSync(src(dir, file), 'utf8')));
  }
}

function optimiseSvg(svg) {
  return svg
    .replace(/<\?xml[\s\S]*?\?>/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<title>[\s\S]*?<\/title>/g, '')
    .replace(/\s(width|height)="[\d.]+(px)?"/g, (m, attr, _px, offset, whole) => (whole.indexOf('<svg') < offset && whole.indexOf('>', whole.indexOf('<svg')) > offset ? '' : m))
    .replace(/(\d+\.\d{2})\d+/g, '$1')        // two decimals are plenty at icon sizes
    .replace(/>\s+</g, '><')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function dataUri(svg) {
  const body = svg
    .replace(/"/g, "'")
    .replace(/%/g, '%25')
    .replace(/#/g, '%23')
    .replace(/</g, '%3C')
    .replace(/>/g, '%3E')
    .replace(/\s+/g, ' ');
  return `data:image/svg+xml,${body}`;
}

let coreCss = `${banner}/* Core icons, embedded. Use: <span class="ds-icon ds-i-search" aria-hidden="true"></span> */\n`;
const missing = [];
for (const name of CORE) {
  const svg = icons.get(name);
  if (!svg) {
    missing.push(name);
    continue;
  }
  coreCss += `.ds-i-${name}{--ds-icon:url("${dataUri(svg)}")}\n`;
}
writeFileSync(dist('css', 'mota-ds-icons.css'), coreCss);

let allCss = `${banner}/* Every icon, loaded from ../icons/ (serve over http/https). */\n`;
for (const [name, svg] of [...icons].sort(([a], [b]) => a.localeCompare(b))) {
  writeFileSync(dist('icons', `${name}.svg`), svg + '\n');
  allCss += `.ds-i-${name}{--ds-icon:url("../icons/${name}.svg")}\n`;
}
writeFileSync(dist('css', 'mota-ds-icons-all.css'), allCss);

const list = [...icons.keys()].sort().map((name) => ({
  name,
  title: titles.get(name) || name.replace(/-/g, ' ').replace(/^\w/, (c) => c.toUpperCase()),
  core: CORE.includes(name),
}));
writeFileSync(join(here, 'docs', 'icons-data.js'), `// Generated by build.mjs\nwindow.DS_ICONS = ${JSON.stringify(list)};\n`);

// ---- JS ---------------------------------------------------------------------------
writeFileSync(dist('js', 'mota-ds.js'), readFileSync(src('js', 'mota-ds.js'), 'utf8'));

// ---- Report ------------------------------------------------------------------------
const kb = (file) => (readFileSync(file).length / 1024).toFixed(1) + ' KB';
console.log(`MoTA Design System v${pkg.version}`);
console.log(`  css/mota-ds.css            ${kb(dist('css', 'mota-ds.css'))}  (${cssFiles.length} source files)`);
console.log(`  css/mota-ds.min.css        ${kb(dist('css', 'mota-ds.min.css'))}`);
console.log(`  css/mota-ds-icons.css      ${kb(dist('css', 'mota-ds-icons.css'))}  (${CORE.length - missing.length} core icons)`);
console.log(`  css/mota-ds-icons-all.css  ${kb(dist('css', 'mota-ds-icons-all.css'))}  (${icons.size} icons)`);
console.log(`  js/mota-ds.js              ${kb(dist('js', 'mota-ds.js'))}`);
if (missing.length) {
  console.error(`Missing core icons: ${missing.join(', ')}`);
  process.exitCode = 1;
}

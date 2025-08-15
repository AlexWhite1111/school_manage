#!/usr/bin/env node
// Replace common hardcoded colors in CSS/LESS/SCSS with AntD CSS variables
// Usage:
//   node tools/replace-css-colors.mjs --dry        # preview
//   node tools/replace-css-colors.mjs              # apply changes
// Options:
//   --include substr  (repeatable)
//   --exclude substr  (repeatable)

import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const SCAN_ROOT = path.join(ROOT, 'frontend', 'src');
const FILE_EXTS = new Set(['.css', '.less', '.scss']);

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { dry: false, include: [], exclude: [] };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--dry') opts.dry = true;
    else if (a === '--include') opts.include.push(args[++i]);
    else if (a === '--exclude') opts.exclude.push(args[++i]);
  }
  return opts;
}

function walk(dir, out = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (FILE_EXTS.has(path.extname(e.name))) out.push(p);
  }
  return out;
}

function included(file, opts) {
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  const inc = opts.include.length === 0 || opts.include.some(s => rel.includes(s));
  const exc = opts.exclude.some(s => rel.includes(s));
  return inc && !exc;
}

// Safe replacements only (lossless semantics)
const REPLACEMENTS = [
  // brand hues
  { re: /#1890ff\b/gi, to: 'var(--ant-color-primary)' },
  { re: /#1677ff\b/gi, to: 'var(--ant-color-primary)' },
  { re: /#52c41a\b/gi, to: 'var(--ant-color-success)' },
  { re: /#faad14\b/gi, to: 'var(--ant-color-warning)' },
  { re: /#ff4d4f\b/gi, to: 'var(--ant-color-error)' },
  { re: /#722ed1\b/gi, to: 'var(--ant-color-info)' },

  // text
  { re: /#8c8c8c\b/gi, to: 'var(--ant-color-text-secondary)' },
  { re: /#666\b/gi, to: 'var(--ant-color-text-tertiary)' },
  { re: /#999\b/gi, to: 'var(--ant-color-text-tertiary)' },

  // borders
  { re: /#d9d9d9\b/gi, to: 'var(--ant-color-border)' },
  { re: /#e8e8e8\b/gi, to: 'var(--ant-color-border-secondary)' },

  // backgrounds
  { re: /#ffffff\b/gi, to: 'var(--ant-color-bg-container)' },
  { re: /#fff\b/gi, to: 'var(--ant-color-bg-container)' },
  { re: /#f5f5f5\b/gi, to: 'var(--ant-color-bg-layout)' },
  { re: /#f0f0f0\b/gi, to: 'var(--ant-color-bg-layout)' },
  { re: /#fafafa\b/gi, to: 'var(--ant-color-bg-layout)' },
  { re: /#1f1f1f\b/gi, to: 'var(--ant-color-bg-container)' },
  { re: /#141414\b/gi, to: 'var(--ant-color-bg-layout)' },
  { re: /#2a2a2a\b/gi, to: 'var(--ant-color-bg-container)' },
  { re: /#262626\b/gi, to: 'var(--ant-color-bg-container)' },
  { re: /#333\b/gi, to: 'var(--ant-color-bg-container)' },
  { re: /#444\b/gi, to: 'var(--ant-color-border-secondary)' },

  // primary with alpha → use primary-bg (closest semantic)
  { re: /rgba\(\s*24\s*,\s*144\s*,\s*255\s*,\s*0\.(04|05|06|08|1|12|15|2|3|4|6)\s*\)/gi, to: 'var(--ant-color-primary-bg)' },

  // black alpha → neutral/fill/border tokens
  { re: /rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\.06\s*\)/gi, to: 'var(--ant-color-border-secondary)' },
  { re: /rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\.08\s*\)/gi, to: 'var(--ant-color-fill-tertiary)' },
  { re: /rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\.1\s*\)/gi, to: 'var(--ant-color-fill-tertiary)' },
  { re: /rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\.12\s*\)/gi, to: 'var(--ant-color-border-secondary)' },
  { re: /rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\.15\s*\)/gi, to: 'var(--ant-color-fill-secondary)' },
  { re: /rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\.2\s*\)/gi, to: 'var(--ant-color-fill)' },

  // white alpha → neutral/fill/border tokens (dark mode)
  { re: /rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\.04\s*\)/gi, to: 'var(--ant-color-fill-quaternary)' },
  { re: /rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\.08\s*\)/gi, to: 'var(--ant-color-fill-tertiary)' },
  { re: /rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\.1\s*\)/gi, to: 'var(--ant-color-fill-tertiary)' },
  { re: /rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\.12\s*\)/gi, to: 'var(--ant-color-border-secondary)' },
  { re: /rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\.15\s*\)/gi, to: 'var(--ant-color-fill-secondary)' },
];

function processFile(file, opts) {
  const before = fs.readFileSync(file, 'utf8');
  let after = before;
  let hits = 0;
  for (const { re, to } of REPLACEMENTS) {
    if (re.test(after)) {
      after = after.replace(re, to);
      hits++;
    }
  }
  if (hits > 0 && before !== after) {
    if (!opts.dry) fs.writeFileSync(file, after, 'utf8');
    return { file, hits };
  }
  return null;
}

function main() {
  const opts = parseArgs();
  const files = walk(SCAN_ROOT).filter(f => included(f, opts));
  const results = [];
  for (const f of files) {
    const r = processFile(f, opts);
    if (r) results.push(r);
  }
  const total = results.reduce((s, r) => s + r.hits, 0);
  const rels = results.map(r => ({ file: path.relative(ROOT, r.file).replace(/\\/g, '/'), hits: r.hits }));
  const summary = { dry: opts.dry, filesTouched: results.length, totalRuleHits: total, details: rels };
  process.stdout.write(JSON.stringify(summary, null, 2));
}

main();


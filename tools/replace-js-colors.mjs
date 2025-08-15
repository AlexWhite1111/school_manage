#!/usr/bin/env node
// Replace hardcoded colors inside JS/TS/TSX/JSX string literals with AntD CSS variables
// Usage:
//   node tools/replace-js-colors.mjs --dry                  # preview
//   node tools/replace-js-colors.mjs                        # apply
// Options:
//   --include substr (repeatable)
//   --exclude substr (repeatable)

import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const SCAN_ROOT = path.join(ROOT, 'frontend', 'src');
const FILE_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx']);

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { dry: false, include: [], exclude: ['frontend/src/theme/'] };
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

// Map of exact literals -> css var
const COLOR_TO_VAR = {
  '#1677ff': 'var(--ant-color-primary)',
  '#1890ff': 'var(--ant-color-primary)',
  '#52c41a': 'var(--ant-color-success)',
  '#faad14': 'var(--ant-color-warning)',
  '#ff4d4f': 'var(--ant-color-error)',
  '#8c8c8c': 'var(--ant-color-text-secondary)',
  '#666': 'var(--ant-color-text-tertiary)',
  '#999': 'var(--ant-color-text-tertiary)',
  '#d9d9d9': 'var(--ant-color-border)',
  '#e8e8e8': 'var(--ant-color-border-secondary)',
  '#141414': 'var(--ant-color-bg-layout)',
  '#1f1f1f': 'var(--ant-color-bg-container)',
  '#ffffff': 'var(--ant-color-bg-container)',
  '#fff': 'var(--ant-color-bg-container)',
  '#3f8600': 'var(--ant-color-success)',
  '#fa8c16': 'var(--ant-color-warning)',
  '#722ed1': 'var(--ant-color-info)',
  '#cf1322': 'var(--ant-color-error)',
  '#ff7875': 'var(--ant-color-error)'
};

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function replaceInContent(content) {
  let after = content;
  let hits = 0;
  // Replace quoted hex literals: '#xxxxxx' "#xxxxxx" `#xxxxxx`
  for (const [lit, to] of Object.entries(COLOR_TO_VAR)) {
    const litEsc = escapeRegExp(lit);
    const reS = new RegExp("'" + litEsc + "'", 'g');
    const reD = new RegExp('"' + litEsc + '"', 'g');
    const reB = new RegExp('`' + litEsc + '`', 'g');
    after = after.replace(reS, `'${to}'`);
    after = after.replace(reD, '"' + to + '"');
    after = after.replace(reB, '`' + to + '`');
    if (reS.test(content) || reD.test(content) || reB.test(content)) hits++;
  }
  return { after, hits };
}

function processFile(file, opts) {
  const before = fs.readFileSync(file, 'utf8');
  const { after, hits } = replaceInContent(before);
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


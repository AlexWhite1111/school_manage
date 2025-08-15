#!/usr/bin/env node
// Color scanner for frontend/src: extracts color literals, counts usages, clusters near colors (DeltaE <= 3)
// Outputs JSON summary to stdout and writes details to docs/design/color-usage.json

import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const SCAN_ROOT = path.join(ROOT, 'frontend', 'src');
const OUTPUT_JSON = path.join(ROOT, 'docs', 'design', 'color-usage.json');

const FILE_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.css', '.less', '.scss']);

const HEX_SHORT = /#([0-9a-fA-F]{3,4})\b/g;
const HEX_LONG = /#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g;
const RGB = /rgb\(\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*\)/g;
const RGBA = /rgba\(\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*(0|1|0?\.[0-9]+)\s*\)/g;
const HSL = /hsl\(\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})%\s*,\s*([0-9]{1,3})%\s*\)/g;
const HSLA = /hsla\(\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})%\s*,\s*([0-9]{1,3})%\s*,\s*(0|1|0?\.[0-9]+)\s*\)/g;

function walk(dir, out = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (FILE_EXTS.has(path.extname(e.name))) out.push(p);
  }
  return out;
}

function expandHex(short) {
  return short.split('').map(c => c + c).join('');
}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function parseColorLiteral(lit) {
  // Returns { r,g,b,a, raw }
  let m;
  if ((m = lit.match(/^#([0-9a-fA-F]{3,4})$/))) {
    const hex = m[1];
    const full = expandHex(hex);
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    const a = full.length === 8 ? parseInt(full.slice(6, 8), 16) / 255 : 1;
    return { r, g, b, a, raw: lit };
  }
  if ((m = lit.match(/^#([0-9a-fA-F]{6})([0-9a-fA-F]{2})?$/))) {
    const r = parseInt(m[1].slice(0, 2), 16);
    const g = parseInt(m[1].slice(2, 4), 16);
    const b = parseInt(m[1].slice(4, 6), 16);
    const a = m[2] ? parseInt(m[2], 16) / 255 : 1;
    return { r, g, b, a, raw: lit };
  }
  if ((m = lit.match(/^rgb\(/))) {
    const parts = lit.replace(/rgb\(|\)/g, '').split(',').map(s => s.trim());
    const [r, g, b] = parts.map(Number);
    return { r, g, b, a: 1, raw: lit };
  }
  if ((m = lit.match(/^rgba\(/))) {
    const parts = lit.replace(/rgba\(|\)/g, '').split(',').map(s => s.trim());
    const [r, g, b, a] = [Number(parts[0]), Number(parts[1]), Number(parts[2]), Number(parts[3])];
    return { r, g, b, a, raw: lit };
  }
  if ((m = lit.match(/^hsl\(/))) {
    const parts = lit.replace(/hsl\(|\)/g, '').split(',').map(s => s.trim());
    const [h, s, l] = [Number(parts[0]), Number(parts[1].replace('%',''))/100, Number(parts[2].replace('%',''))/100];
    const { r, g, b } = hslToRgb(h, s, l);
    return { r, g, b, a: 1, raw: lit };
  }
  if ((m = lit.match(/^hsla\(/))) {
    const parts = lit.replace(/hsla\(|\)/g, '').split(',').map(s => s.trim());
    const [h, s, l, a] = [Number(parts[0]), Number(parts[1].replace('%',''))/100, Number(parts[2].replace('%',''))/100, Number(parts[3])];
    const { r, g, b } = hslToRgb(h, s, l);
    return { r, g, b, a, raw: lit };
  }
  return null;
}

function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2*l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c/2;
  let r1=0,g1=0,b1=0;
  if (h < 60) [r1,g1,b1] = [c,x,0];
  else if (h < 120) [r1,g1,b1] = [x,c,0];
  else if (h < 180) [r1,g1,b1] = [0,c,x];
  else if (h < 240) [r1,g1,b1] = [0,x,c];
  else if (h < 300) [r1,g1,b1] = [x,0,c];
  else [r1,g1,b1] = [c,0,x];
  return { r: Math.round((r1 + m) * 255), g: Math.round((g1 + m) * 255), b: Math.round((b1 + m) * 255) };
}

// Convert RGB to Lab via XYZ (D65)
function rgb2lab(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  r = r <= 0.04045 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
  g = g <= 0.04045 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
  b = b <= 0.04045 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);
  let x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
  let y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 1.00000;
  let z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
  x = x > 0.008856 ? Math.cbrt(x) : (7.787 * x) + 16/116;
  y = y > 0.008856 ? Math.cbrt(y) : (7.787 * y) + 16/116;
  z = z > 0.008856 ? Math.cbrt(z) : (7.787 * z) + 16/116;
  return { L: (116 * y) - 16, a: 500 * (x - y), b: 200 * (y - z) };
}

// CIEDE2000 ΔE
function deltaE(lab1, lab2) {
  // Implementation adapted (compact) for our use
  const { L: L1, a: a1, b: b1 } = lab1;
  const { L: L2, a: a2, b: b2 } = lab2;
  const kL = 1, kC = 1, kH = 1;
  const C1 = Math.hypot(a1, b1);
  const C2 = Math.hypot(a2, b2);
  const CBar = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(Math.pow(CBar, 7) / (Math.pow(CBar, 7) + Math.pow(25, 7))));
  const a1p = (1 + G) * a1;
  const a2p = (1 + G) * a2;
  const C1p = Math.hypot(a1p, b1);
  const C2p = Math.hypot(a2p, b2);
  const h1p = Math.atan2(b1, a1p) * 180 / Math.PI + (Math.atan2(b1, a1p) < 0 ? 360 : 0);
  const h2p = Math.atan2(b2, a2p) * 180 / Math.PI + (Math.atan2(b2, a2p) < 0 ? 360 : 0);
  const dLp = L2 - L1;
  const dCp = C2p - C1p;
  let dhp = h2p - h1p;
  if (dhp > 180) dhp -= 360;
  if (dhp < -180) dhp += 360;
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin((dhp * Math.PI / 180) / 2);
  const LBar = (L1 + L2) / 2;
  const CBarp = (C1p + C2p) / 2;
  let hpBar = h1p + h2p;
  if (Math.abs(h1p - h2p) > 180) hpBar += (h1p + h2p < 360 ? 360 : -360);
  hpBar /= 2;
  const T = 1 - 0.17 * Math.cos((hpBar - 30) * Math.PI/180)
              + 0.24 * Math.cos((2 * hpBar) * Math.PI/180)
              + 0.32 * Math.cos(((3 * hpBar) + 6) * Math.PI/180)
              - 0.20 * Math.cos(((4 * hpBar) - 63) * Math.PI/180);
  const Sl = 1 + (0.015 * Math.pow(LBar - 50, 2)) / Math.sqrt(20 + Math.pow(LBar - 50, 2));
  const Sc = 1 + 0.045 * CBarp;
  const Sh = 1 + 0.015 * CBarp * T;
  const Rt = -2 * Math.sqrt(Math.pow(CBarp, 7) / (Math.pow(CBarp, 7) + Math.pow(25, 7)))
              * Math.sin((60 * Math.exp(-Math.pow((hpBar - 275) / 25, 2))) * Math.PI/180);
  const dE = Math.sqrt(
    Math.pow(dLp / (kL * Sl), 2) + Math.pow(dCp / (kC * Sc), 2) + Math.pow(dHp / (kH * Sh), 2)
  ) + Rt * (dCp / (kC * Sc)) * (dHp / (kH * Sh));
  return dE;
}

function canonicalize(colorMap) {
  // Cluster colors by ΔE <= 3, return { canonicalHex -> { count, members: [raw], examples } }
  const entries = Array.from(colorMap.values());
  const nodes = entries.map(e => ({ ...e, lab: rgb2lab(e.rgb.r, e.rgb.g, e.rgb.b), used: false }));
  const clusters = [];
  const threshold = 3;
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].used) continue;
    const cluster = [nodes[i]];
    nodes[i].used = true;
    for (let j = i + 1; j < nodes.length; j++) {
      if (nodes[j].used) continue;
      const d = deltaE(nodes[i].lab, nodes[j].lab);
      if (d <= threshold) {
        nodes[j].used = true;
        cluster.push(nodes[j]);
      }
    }
    clusters.push(cluster);
  }
  const result = {};
  for (const cluster of clusters) {
    // choose canonical: the most frequent
    const canonical = cluster.reduce((a, b) => (b.count > a.count ? b : a));
    const key = canonical.hex;
    result[key] = {
      count: cluster.reduce((sum, n) => sum + n.count, 0),
      members: cluster.map(n => n.raw).sort(),
      examples: Array.from(new Set(cluster.flatMap(n => n.examples))).slice(0, 10)
    };
  }
  return result;
}

function toHex({ r, g, b }) {
  return '#' + [r, g, b].map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('').toLowerCase();
}

function scan() {
  const files = walk(SCAN_ROOT);
  const colorToData = new Map();
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const dirs = [HEX_LONG, HEX_SHORT, RGB, RGBA, HSL, HSLA];
    for (const re of dirs) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(content)) !== null) {
        let raw;
        if (re === HEX_SHORT) raw = `#${m[1]}`;
        else if (re === HEX_LONG) raw = `#${m[1]}` + (m[2] ? m[2] : '');
        else raw = m[0];
        const parsed = parseColorLiteral(raw);
        if (!parsed) continue;
        const key = raw;
        const rel = path.relative(ROOT, file).replace(/\\/g, '/');
        if (!colorToData.has(key)) {
          colorToData.set(key, {
            raw: key,
            count: 0,
            examples: [],
            rgb: { r: parsed.r, g: parsed.g, b: parsed.b },
            hex: toHex({ r: parsed.r, g: parsed.g, b: parsed.b })
          });
        }
        const item = colorToData.get(key);
        item.count += 1;
        if (item.examples.length < 10 && !item.examples.includes(rel)) item.examples.push(rel);
      }
    }
  }
  const all = Array.from(colorToData.values()).sort((a, b) => b.count - a.count);
  const clusters = canonicalize(colorToData);
  const top20 = all.slice(0, 20).map(({ raw, count, examples }) => ({ color: raw, count, examples }));
  const distinct = Object.keys(clusters).length;
  const totalDistinctLiterals = all.length;
  const dedupRatio = totalDistinctLiterals === 0 ? 0 : (1 - distinct / totalDistinctLiterals);
  const summary = { totalDistinctLiterals, mergedDistinctColors: distinct, dedupRatio, top20, clusters };
  return summary;
}

function main() {
  if (!fs.existsSync(path.dirname(OUTPUT_JSON))) {
    fs.mkdirSync(path.dirname(OUTPUT_JSON), { recursive: true });
  }
  const summary = scan();
  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(summary, null, 2), 'utf8');
  process.stdout.write(JSON.stringify(summary, null, 2));
}

main();


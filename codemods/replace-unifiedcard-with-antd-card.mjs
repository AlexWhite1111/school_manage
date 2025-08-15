/**
 * Codemod: replace-unifiedcard-with-antd-card (ESM)
 * - Replace UnifiedCard/ProjectCard usages with AntD Card
 * - Map props: density->size, isHoverable->hoverable, variant="ghost"->bordered={false}, clickable->hoverable
 * - Update imports to use { Card } from 'antd'
 */
import fs from 'node:fs';
import path from 'node:path';

// Resolve from repo root; script may be run from repo root or subdirs
const REPO_ROOT = path.resolve('.');
const FRONTEND_SRC = fs.existsSync(path.join(REPO_ROOT, 'frontend', 'src'))
  ? path.join(REPO_ROOT, 'frontend', 'src')
  : path.resolve('src');

function walk(dir, acc = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (/\.(t|j)sx?$/.test(entry.name)) acc.push(full);
  }
  return acc;
}

function ensureAntdCardImport(code) {
  let newCode = code;
  const antdImportRegex = /import\s*\{([^}]*)\}\s*from\s*['"]antd['"];?/g;
  if (antdImportRegex.test(newCode)) {
    newCode = newCode.replace(antdImportRegex, (m, p1) => {
      const names = p1.split(',').map((s) => s.trim()).filter(Boolean);
      if (!names.includes('Card')) names.push('Card');
      return `import { ${Array.from(new Set(names)).join(', ')} } from 'antd';`;
    });
  } else {
    // prepend antd import
    newCode = `import { Card } from 'antd';\n` + newCode;
  }
  // remove UnifiedCard / ProjectCard imports
  newCode = newCode.replace(/import\s+UnifiedCard\s+from\s+['"]@\/components\/UnifiedCard['"];?\n?/g, '');
  newCode = newCode.replace(/import\s+ProjectCard\s+from\s+['"]@\/components\/ui\/ProjectCard['"];?\n?/g, '');
  return newCode;
}

function transformProps(code) {
  let newCode = code;
  // density -> size
  newCode = newCode.replace(/density=\{?"compact"\}?/g, 'size="small"');
  newCode = newCode.replace(/density=\{?"comfortable"\}?/g, 'size="default"');
  // isHoverable -> hoverable
  newCode = newCode.replace(/\bisHoverable\b(=\{[^}]*\})?/g, (m, p1) => `hoverable${p1 || ''}`);
  // variant="ghost" -> bordered={false}
  newCode = newCode.replace(/variant=\{?"ghost"\}?/g, 'bordered={false}');
  // remove variant="solid"
  newCode = newCode.replace(/\s*variant=\{?"solid"\}?/g, '');
  // ProjectCard clickable -> hoverable
  newCode = newCode.replace(/\bclickable\b(=\{[^}]*\})?/g, (m, p1) => `hoverable${p1 || ''}`);
  return newCode;
}

function transformTags(code) {
  let newCode = code;
  // Replace open/close tags
  newCode = newCode.replace(/<UnifiedCard(\s|>)/g, '<Card$1');
  newCode = newCode.replace(/<\/UnifiedCard>/g, '</Card>');
  newCode = newCode.replace(/<ProjectCard(\s|>)/g, '<Card$1');
  newCode = newCode.replace(/<\/ProjectCard>/g, '</Card>');
  return newCode;
}

function processFile(file) {
  let code = fs.readFileSync(file, 'utf8');
  if (!/UnifiedCard|ProjectCard/.test(code)) return null;
  const before = code;
  code = ensureAntdCardImport(code);
  code = transformProps(code);
  code = transformTags(code);
  if (code !== before) {
    fs.writeFileSync(file, code, 'utf8');
    return file;
  }
  return null;
}

function run() {
  const files = walk(FRONTEND_SRC);
  const changed = [];
  for (const f of files) {
    const res = processFile(f);
    if (res) changed.push(path.relative(process.cwd(), res));
  }
  console.log(JSON.stringify({ changedCount: changed.length, changed }, null, 2));
}

run();


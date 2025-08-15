/**
 * Codemod: replace-card-button (ESM JS)
 * - Replace AntD Card/Button with UnifiedCard/AppButton
 * - Migrate common props (type/size/danger/ghost/htmlType)
 * - Preserve antd import if Card.* or Button.* API remains
 * - Generate manual-fix report at docs/audit/manual-fix-card-button.md
 *
 * Run: node codemods/replace-card-button.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const FRONTEND_SRC = path.resolve('frontend', 'src');
const AUDIT_DIR = path.resolve('docs', 'audit');
const AUDIT_FILE = path.join(AUDIT_DIR, 'manual-fix-card-button.md');

const buttonSizeMap = { small: 'sm', middle: 'md', default: 'md', large: 'lg' };
const buttonTypeToHierarchy = { primary: 'primary', default: 'secondary', dashed: 'tertiary', text: 'tertiary', link: 'link' };

function walk(dir, acc = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (/\.(t|j)sx?$/.test(entry.name)) acc.push(full);
  }
  return acc;
}

function ensureImports(code, useCard, useButton) {
  let newCode = code;
  const keepCardApi = /\bCard\s*\./.test(newCode);
  const keepButtonApi = /\bButton\s*\./.test(newCode);

  newCode = newCode.replace(/import\s*\{([^}]*)\}\s*from\s*['"]antd['"];?/g, (m, p1) => {
    const names = p1
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const kept = names.filter((n) => {
      if (/^Button$/.test(n)) return keepButtonApi; // keep if Button.* remains
      if (/^Card$/.test(n)) return keepCardApi; // keep if Card.* remains
      return true;
    });
    if (kept.length === 0) return '';
    return `import { ${kept.join(', ')} } from 'antd';`;
  });

  const needLines = [];
  if (useCard && !/from ['"]@\/components\/UnifiedCard['"]/.test(newCode)) {
    needLines.push(`import UnifiedCard from '@/components/UnifiedCard';`);
  }
  if (useButton && !/from ['"]@\/components\/AppButton['"]/.test(newCode)) {
    needLines.push(`import AppButton from '@/components/AppButton';`);
  }
  if (needLines.length > 0) newCode = needLines.join('\n') + '\n' + newCode;
  return newCode;
}

function transformButtons(code, notes) {
  let changed = false;
  let newCode = code.replace(/<Button(\s+[^>]*)?>/g, (m, attrs = '') => {
    changed = true;
    let a = attrs;
    a = a.replace(/\stype=\{?"(primary|default|dashed|text|link)"\}?/g, (_m, t) => {
      const h = buttonTypeToHierarchy[t] || 'secondary';
      return ` hierarchy="${h}"`;
    });
    a = a.replace(/\ssize=\{?"(small|middle|large)"\}?/g, (_m, s) => ` size="${buttonSizeMap[s]}"`);
    if (/\sghost(=\{?true\}?|\b)/.test(a)) {
      notes.push('ghost Button -> 使用 hierarchy="tertiary" 与合适的 tone 替代');
      a = a.replace(/\sghost(=\{?true\}?|\b)/g, '');
    }
    a = a.replace(/\shtmlType=\{?"(button|submit|reset)"\}?/g, (_m, t) => ` type="${t}"`);
    return `<AppButton${a}>`;
  });
  newCode = newCode.replace(/<\/Button>/g, () => {
    changed = true;
    return '</AppButton>';
  });
  // Normalize props on already-converted AppButton
  newCode = newCode.replace(/<AppButton(\s+[^>]*)?>/g, (m, attrs = '') => {
    let a = attrs;
    // htmlType -> native type
    a = a.replace(/\shtmlType=\{?"(button|submit|reset)"\}?/g, (_m, t) => ` type="${t}"`);
    // if type carries visual intent (legacy from antd), convert to hierarchy
    a = a.replace(/\stype=\{?"(primary|default|dashed|text|link)"\}?/g, (_m, t) => {
      const h = buttonTypeToHierarchy[t] || 'secondary';
      changed = true;
      return ` hierarchy="${h}"`;
    });
    // ghost cleanup
    if (/\sghost(=\{?true\}?|\b)/.test(a)) {
      notes.push('移除 AppButton 残留 ghost 属性');
      a = a.replace(/\sghost(=\{?true\}?|\b)/g, '');
      changed = true;
    }
    return `<AppButton${a}>`;
  });
  return { code: newCode, changed };
}

function transformCards(code, notes) {
  let changed = false;
  let newCode = code.replace(/<Card(\s+[^>]*)?>/g, (m, attrs = '') => {
    changed = true;
    let a = attrs;
    a = a.replace(/\ssize=\{?"(small|default)"\}?/g, (_m, s) => ` density="${s === 'small' ? 'compact' : 'comfortable'}"`);
    a = a.replace(/\shoverable(=\{?true\}?|\b)/g, ' isHoverable');
    if (/\sbordered=\{?false\}?/.test(a)) {
      a = a.replace(/\sbordered=\{?false\}?/g, ' variant="ghost"');
    }
    if (/style=\{\{[^}]*background(Color)?\s*:/.test(a)) {
      notes.push('Card 存在内联背景色，请检查是否应改为 variant="tinted/ghost"');
    }
    return `<UnifiedCard${a}>`;
  });
  newCode = newCode.replace(/<\/Card>/g, () => {
    changed = true;
    return '</UnifiedCard>';
  });
  return { code: newCode, changed };
}

function processFile(file) {
  const rel = path.relative(process.cwd(), file).replace(/\\/g, '/');
  const notes = [];
  let code = fs.readFileSync(file, 'utf8');
  const hadCard = /<Card\b/.test(code);
  const hadButton = /<Button\b/.test(code);
  // Always record notes if legacy Card.* / Button.* API is present
  if (/\bCard\s*\./.test(code)) notes.push('存在 Card.* API（Meta/Grid/Actions），需手工迁移');
  if (/\bButton\s*\./.test(code)) notes.push('存在 Button.* API（Group等），需手工迁移');
  if (!hadCard && !hadButton) return { file: rel, success: true, changed: false, notes };

  const btn = transformButtons(code, notes);
  code = btn.code;
  const card = transformCards(code, notes);
  code = card.code;
  const changed = btn.changed || card.changed;
  if (!changed) return { file: rel, success: true, changed: false, notes };

  // Add notes for complex APIs (already handled above as well)

  code = ensureImports(code, card.changed, btn.changed);

  try {
    fs.writeFileSync(file, code, 'utf8');
    return { file: rel, success: true, changed: true, notes };
  } catch (e) {
    notes.push('无法写入文件');
    return { file: rel, success: false, changed: false, notes };
  }
}

function run() {
  const files = walk(FRONTEND_SRC);
  const stats = [];
  for (const f of files) stats.push(processFile(f));
  const attempted = stats.length;
  const changedCount = stats.filter((s) => s.changed).length;
  const successRate = attempted === 0 ? 100 : Math.round((changedCount / attempted) * 100);
  if (!fs.existsSync(AUDIT_DIR)) fs.mkdirSync(AUDIT_DIR, { recursive: true });
  const manual = stats.filter((s) => s.notes.length > 0 || !s.success);
  const manualList = manual
    .map((s) => `- ${s.file}\n  - ${s.notes.join('\n  - ')}`)
    .join('\n');
  const audit = `# Manual Fixes for Card/Button Migration\n\n${manualList || 'No manual fixes detected.'}\n`;
  fs.writeFileSync(AUDIT_FILE, audit, 'utf8');
  const summary = {
    filesProcessed: attempted,
    filesChanged: changedCount,
    successRate,
    manualFixList: path.relative(process.cwd(), AUDIT_FILE).replace(/\\/g, '/'),
  };
  console.log(JSON.stringify(summary, null, 2));
}

run();


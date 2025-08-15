/**
 * Codemod: replace-card-button
 *
 * - Replace Ant Design Card/Button usages with UnifiedCard/AppButton
 * - Migrate common props: type/size/danger/ghost/hoverable/title/extra/footer
 * - Produce audit report for manual fixes: /docs/audit/manual-fix-card-button.md
 *
 * Usage:
 *   npx ts-node codemods/replace-card-button.ts
 */
import path from 'node:path';
import fs from 'node:fs';

const FRONTEND_SRC = path.resolve('frontend', 'src');
const AUDIT_DIR = path.resolve('docs', 'audit');
const AUDIT_FILE = path.join(AUDIT_DIR, 'manual-fix-card-button.md');

type ReplacementStat = { file: string; success: boolean; notes: string[] };

const buttonSizeMap: Record<string, 'sm' | 'md' | 'lg'> = {
  small: 'sm',
  middle: 'md',
  default: 'md',
  large: 'lg',
};

const buttonTypeToHierarchy: Record<string, 'primary' | 'secondary' | 'tertiary' | 'link'> = {
  primary: 'primary',
  default: 'secondary',
  dashed: 'tertiary',
  text: 'tertiary',
  link: 'link',
};

function walk(dir: string, acc: string[] = []): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, acc);
    } else if (/\.(t|j)sx?$/.test(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
}

function ensureImports(code: string, useCard: boolean, useButton: boolean): string {
  // Remove antd Button/Card named imports when fully replaced
  let newCode = code;
  newCode = newCode.replace(/import\s*\{([^}]*)\}\s*from\s*['"]antd['"];?/g, (m, p1) => {
    const names = p1.split(',').map((s: string) => s.trim()).filter(Boolean);
    const kept = names.filter((n: string) => !/^Button$/.test(n) && !/^Card$/.test(n));
    if (kept.length === 0) return '';
    return `import { ${kept.join(', ')} } from 'antd';`;
  });

  // Add UnifiedCard/AppButton imports if used
  const needLines: string[] = [];
  if (useCard && !/from ['"]@\/components\/UnifiedCard['"]/.test(newCode)) {
    needLines.push(`import UnifiedCard from '@/components/UnifiedCard';`);
  }
  if (useButton && !/from ['"]@\/components\/AppButton['"]/.test(newCode)) {
    needLines.push(`import AppButton from '@/components/AppButton';`);
  }
  if (needLines.length > 0) {
    newCode = needLines.join('\n') + '\n' + newCode;
  }
  return newCode;
}

function transformButtons(code: string, notes: string[]): { code: string; changed: boolean } {
  let changed = false;
  // Replace <Button ...> to <AppButton ...>
  let newCode = code.replace(/<Button(\s+[^>]*)?>/g, (m, attrs = '') => {
    changed = true;
    let a = attrs;
    // type -> hierarchy and tone
    a = a.replace(/\stype=\{?"(primary|default|dashed|text|link)"\}?/g, (_m, t) => {
      const h = buttonTypeToHierarchy[t] || 'secondary';
      return ` hierarchy="${h}"`;
    });
    // size -> size map
    a = a.replace(/\ssize=\{?"(small|middle|large)"\}?/g, (_m, s) => ` size="${buttonSizeMap[s]}"`);
    // danger -> danger
    // ghost -> hierarchy tertiary and keep note
    if (/\sghost(=\{?true\}?|\b)/.test(a)) {
      notes.push('Replaced ghost Button -> consider hierarchy="tertiary" tone');
      a = a.replace(/\sghost(=\{?true\}?|\b)/g, '');
    }
    // loading keep
    // htmlType -> type
    a = a.replace(/\shtmlType=\{?"(button|submit|reset)"\}?/g, (_m, t) => ` type="${t}"`);
    // danger prop forwarded
    return `<AppButton${a}>`;
  });
  newCode = newCode.replace(/<\/Button>/g, () => {
    changed = true;
    return '</AppButton>';
  });
  return { code: newCode, changed };
}

function transformCards(code: string, notes: string[]): { code: string; changed: boolean } {
  let changed = false;
  let cardOpenTag = /<Card(\s+[^>]*)?>/g;
  let newCode = code.replace(cardOpenTag, (m, attrs = '') => {
    changed = true;
    let a = attrs;
    // size -> density
    a = a.replace(/\ssize=\{?"(small|default)"\}?/g, (_m, s) => ` density="${s === 'small' ? 'compact' : 'comfortable'}"`);
    // hoverable -> isHoverable
    a = a.replace(/\shoverable(=\{?true\}?|\b)/g, ' isHoverable');
    // title/extra carried as-is
    // bordered -> variant
    if (/\sbordered=\{?false\}?/.test(a)) {
      a = a.replace(/\sbordered=\{?false\}?/g, ' variant="ghost"');
    }
    // type or status not existing in antd Card; tint detection heuristic
    // style background overrides -> add note
    if (/style=\{\{[^}]*background(Color)?\s*:/.test(a)) {
      notes.push('Card had inline background style; verify variant/tinted mapping');
    }
    return `<UnifiedCard${a}>`;
  });
  newCode = newCode.replace(/<\/Card>/g, () => {
    changed = true;
    return '</UnifiedCard>';
  });
  return { code: newCode, changed };
}

function processFile(file: string): ReplacementStat {
  const rel = path.relative(process.cwd(), file).replace(/\\/g, '/');
  const notes: string[] = [];
  let code = fs.readFileSync(file, 'utf8');
  const hadCard = /<Card\b/.test(code);
  const hadButton = /<Button\b/.test(code);
  if (!hadCard && !hadButton) {
    return { file: rel, success: true, notes: [] };
  }
  const before = code;
  const btn = transformButtons(code, notes);
  code = btn.code;
  const card = transformCards(code, notes);
  code = card.code;
  const changed = btn.changed || card.changed;

  if (!changed) return { file: rel, success: true, notes };

  code = ensureImports(code, card.changed, btn.changed);

  try {
    fs.writeFileSync(file, code, 'utf8');
    return { file: rel, success: true, notes };
  } catch (e) {
    notes.push('Failed to write modified file');
    return { file: rel, success: false, notes };
  }
}

function run() {
  const files = walk(FRONTEND_SRC);
  const stats: ReplacementStat[] = [];
  for (const f of files) {
    const res = processFile(f);
    stats.push(res);
  }
  const affected = stats.filter(s => s.notes.length > 0 || !s.success).map(s => s.file);
  const attempted = stats.filter(s => true).length;
  const changedCount = stats.filter(s => s.success).length;
  const successRate = Math.round((changedCount / attempted) * 100);

  if (!fs.existsSync(AUDIT_DIR)) fs.mkdirSync(AUDIT_DIR, { recursive: true });
  const manualList = stats
    .filter(s => s.notes.length > 0 || !s.success)
    .map(s => `- ${s.file}\n  - ${s.notes.join('\n  - ')}`)
    .join('\n');
  const audit = `# Manual Fixes for Card/Button Migration\n\n${manualList || 'No manual fixes detected.'}\n`;
  fs.writeFileSync(AUDIT_FILE, audit, 'utf8');

  const summary = {
    filesProcessed: attempted,
    successRate,
    manualFixList: path.relative(process.cwd(), AUDIT_FILE).replace(/\\/g, '/'),
  };
  console.log(JSON.stringify(summary, null, 2));
}

run();


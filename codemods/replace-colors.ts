import { API, FileInfo, JSCodeshift, Options } from 'jscodeshift';

/**
 * jscodeshift codemod: replace hard-coded colors with semantic tokens
 * Usage:
 *   npx jscodeshift -t codemods/replace-colors.ts frontend/src --extensions=ts,tsx,js,jsx --dry --parser=tsx
 * Options:
 *   --dry       Dry-run (no file writes)
 *   --include   Glob or substring to include (can repeat)
 *   --exclude   Glob or substring to exclude (can repeat)
 */

type CLIOptions = Options & {
  dry?: boolean;
  include?: string | string[];
  exclude?: string | string[];
};

// Map literal -> CSS var (we avoid injecting theme.useToken() to keep transformations safe everywhere)
const COLOR_TO_VAR: Record<string, string> = {
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

function fileIncluded(path: string, opts: CLIOptions): boolean {
  const { include, exclude } = opts;
  const inc = include ? (Array.isArray(include) ? include : [include]) : [];
  const exc = exclude ? (Array.isArray(exclude) ? exclude : [exclude]) : [];
  const okInc = inc.length === 0 || inc.some(i => path.includes(i));
  const okExc = !exc.some(e => path.includes(e));
  return okInc && okExc;
}

// No token hook injection: we replace literals with CSS var strings which are valid in inline style

function replaceStringLiteralColors(j: JSCodeshift, root: ReturnType<JSCodeshift>) {
  let replaced = 0;
  root.find(j.Literal)
    .filter(p => typeof p.value.value === 'string')
    .forEach(p => {
      const v = String(p.value.value);
      const cssVar = (COLOR_TO_VAR as any)[v];
      if (!cssVar) return;
      j(p).replaceWith(j.literal(cssVar));
      replaced++;
    });
  return replaced;
}

export default function transformer(file: FileInfo, api: API, options: CLIOptions) {
  const j = api.jscodeshift;
  const src = file.source;
  if (!fileIncluded(file.path, options)) return src;
  if (!/\.(tsx?|jsx?)$/.test(file.path)) return src;

  const root = j(src);
  const cnt = replaceStringLiteralColors(j, root);
  if (cnt > 0) {
    return root.toSource({ quote: 'single' });
  }
  return src;
}


require('./rt/electron-rt');
//////////////////////////////
// User Defined Preload scripts below
// 注入运行时API地址与配置，供前端读取
// 支持三路动态配置：server-config.json、环境变量(API_BASE_URL/ API_BASE_URLS)、内置runtime-config.js
;(function injectRuntimeApiBase() {
  try {
    // 延迟 require 以避免打包器处理
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('fs');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const path = require('path');

    function readJsonIfExists(filePath: string): unknown | null {
      try {
        if (fs.existsSync(filePath)) {
          const raw = fs.readFileSync(filePath, 'utf-8');
          return JSON.parse(raw);
        }
      } catch (_e) {
        // ignore parse errors
      }
      return null;
    }

    function findAppDirCandidates(): string[] {
      const candidates: string[] = [];
      try {
        // 打包后
        if (process.resourcesPath) {
          candidates.push(path.join(process.resourcesPath, 'app'));
        }
      } catch (_e) {}
      try {
        // 开发模式（相对 electron 工程）
        candidates.push(path.join(__dirname, '..', '..', 'app'));
      } catch (_e) {}
      try {
        // 可执行文件所在目录（便携式分发时可旁挂配置）
        const execDir = path.dirname(process.execPath);
        candidates.push(execDir);
      } catch (_e) {}
      return candidates;
    }

    function readServerConfig(): { apiBaseUrl?: string; candidateApiBaseUrls?: string[] } | null {
      const appDirs = findAppDirCandidates();
      for (const dir of appDirs) {
        const p = path.join(dir, 'server-config.json');
        const data = readJsonIfExists(p) as { apiBaseUrl?: string; candidateApiBaseUrls?: string[] } | null;
        if (data && (data.apiBaseUrl || (Array.isArray(data.candidateApiBaseUrls) && data.candidateApiBaseUrls.length))) {
          return data;
        }
      }
      return null;
    }

    function normalize(url: string): string {
      if (!url) return url;
      return url.replace(/\/$/, '');
    }

    function uniqueOrdered(list: (string | undefined)[]): string[] {
      const seen = new Set<string>();
      const result: string[] = [];
      for (const item of list) {
        if (!item) continue;
        const v = normalize(item);
        if (!seen.has(v)) {
          seen.add(v);
          result.push(v);
        }
      }
      return result;
    }

    const fromEnvSingle = (process.env.API_BASE_URL || '').trim();
    const fromEnvList = (process.env.API_BASE_URLS || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const serverCfg = readServerConfig();

    // 合并出优先地址（用于显示/兜底），以及候选列表
    const resolvedPrimary = serverCfg?.apiBaseUrl || fromEnvSingle || 'http://localhost:3000/api';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const currentRuntime = (window as any).__RUNTIME_CONFIG__ || {};
    const runtimePrimary = typeof currentRuntime.apiBaseUrl === 'string' ? currentRuntime.apiBaseUrl : undefined;
    const runtimeList: string[] = Array.isArray(currentRuntime.candidateApiBaseUrls)
      ? currentRuntime.candidateApiBaseUrls.filter((x: unknown) => typeof x === 'string')
      : [];

    const mergedCandidates = uniqueOrdered([
      serverCfg?.apiBaseUrl,
      ...(serverCfg?.candidateApiBaseUrls || []),
      fromEnvSingle,
      ...fromEnvList,
      runtimePrimary,
      ...runtimeList,
      'http://localhost:3000/api',
    ]);

    // 写回运行时配置
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__RUNTIME_CONFIG__ = {
      ...currentRuntime,
      apiBaseUrl: normalize(resolvedPrimary),
      candidateApiBaseUrls: mergedCandidates,
    };

    console.log('[Electron Preload] API_BASE_URL =', normalize(resolvedPrimary));
    console.log('[Electron Preload] Candidate API URLs =', mergedCandidates);
  } catch (e) {
    // noop
  }
})();
console.log('User Preload!');

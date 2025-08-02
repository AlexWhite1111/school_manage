/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_API_BASE_URL: string;
    readonly VITE_APP_TITLE: string;
    readonly VITE_DEFAULT_THEME: 'light' | 'dark';
    // 在这里添加更多环境变量
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
} 
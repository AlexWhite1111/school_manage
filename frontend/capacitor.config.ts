import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.alex.naturaleducation',
  appName: '自然教育',
  webDir: 'dist',
  server: {
    // 无域名场景：用 http 避免 Mixed Content
    androidScheme: 'http'
  }
};

export default config;

import type { CapacitorConfig } from '@capacitor/cli';
const config: CapacitorConfig = {
  appId: 'kr.teumpick.app',
  appName: '틈픽',
  webDir: 'mobile-dist',
  server: { androidScheme: 'https' },
  android: { allowMixedContent: false },
  plugins: {
    Keyboard: { resize: 'body' },
    SystemBars: { style: 'LIGHT', insetsHandling: 'css' },
  },
};
export default config;

import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: process.env.MOBILE_APP_ID || 'com.rcmpartner.app',
  appName: process.env.MOBILE_APP_NAME || 'RCM Partner',
  webDir: 'out',
  server: {
    androidScheme: 'https',
    // In production, the app runs from bundled files
    // For development, you can uncomment the url below to connect to your dev server
    // url: 'http://localhost:3000',
    // cleartext: true,
  },
  ios: {
    // iOS-specific configuration
    contentInset: 'automatic',
    allowsLinkPreview: true,
    scrollEnabled: true,
    // Uncomment in production to disable logging
    // loggingBehavior: 'none',
  },
  android: {
    // Android-specific configuration
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false, // Set to true for debugging
  },
  plugins: {
    // Plugin configurations
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#1e40af', // Halcyon blue
      showSpinner: false,
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#1e40af',
    },
  },
};

export default config;

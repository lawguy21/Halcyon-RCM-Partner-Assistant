import type { CapacitorConfig } from '@capacitor/cli';

// Mobile app branding colors - configurable via environment variables
// Partners can customize these without code changes
const primaryColor = process.env.NEXT_PUBLIC_PRIMARY_COLOR || '#2563eb';
const secondaryColor = process.env.NEXT_PUBLIC_SECONDARY_COLOR || '#1e40af';

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
      backgroundColor: secondaryColor, // Uses NEXT_PUBLIC_SECONDARY_COLOR or default
      showSpinner: false,
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: secondaryColor, // Uses NEXT_PUBLIC_SECONDARY_COLOR or default
    },
  },
};

export default config;

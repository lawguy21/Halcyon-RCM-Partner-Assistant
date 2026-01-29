# Mobile App Branding

This guide covers building branded iOS and Android mobile apps for white-label partner instances of the Halcyon RCM Partner Assistant.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Using the Build Script](#using-the-build-script)
- [Capacitor Configuration](#capacitor-configuration)
- [iOS-Specific Configuration](#ios-specific-configuration)
- [Android-Specific Configuration](#android-specific-configuration)
- [App Icons and Splash Screens](#app-icons-and-splash-screens)
- [Building for Release](#building-for-release)
- [App Store Submission](#app-store-submission)
- [Troubleshooting](#troubleshooting)

---

## Overview

The Halcyon RCM Partner Assistant uses [Capacitor](https://capacitorjs.com/) to build native iOS and Android apps from the Next.js web application. Each partner can have their own branded mobile app with:

- Custom app name and icon
- Custom app ID/bundle identifier
- Partner-specific branding colors
- Custom splash screen
- Partner app store listings

### Architecture

```
packages/web/
├── src/                    # Next.js source code
├── out/                    # Static export (used by Capacitor)
├── ios/                    # iOS native project
│   └── App/
├── android/                # Android native project
│   └── app/
├── capacitor.config.ts     # Capacitor configuration
└── scripts/
    └── build-capacitor.js  # Build script for mobile
```

---

## Prerequisites

### Development Environment

| Platform | Requirements |
|----------|-------------|
| **iOS** | macOS, Xcode 15+, Apple Developer account |
| **Android** | Android Studio, JDK 17+, Google Play Console account |
| **Both** | Node.js 20+, npm |

### Install Dependencies

```bash
# Install project dependencies
npm install

# Install Capacitor CLI globally (optional)
npm install -g @capacitor/cli
```

---

## Using the Build Script

### Basic Usage

The `build-mobile.sh` script automates the mobile build process:

```bash
# Build for both platforms
./scripts/build-mobile.sh \
  --app-id "com.partner.rcm" \
  --app-name "Partner RCM" \
  --platform both
```

### Script Options

| Option | Description | Default |
|--------|-------------|---------|
| `--app-id` | Application ID (bundle identifier) | `com.rcmpartner.app` |
| `--app-name` | Application display name | `RCM Partner` |
| `--bundle-id` | iOS bundle ID (if different from app-id) | Same as `--app-id` |
| `--platform` | Target platform: `ios`, `android`, or `both` | `both` |

### Examples

```bash
# iOS only
./scripts/build-mobile.sh \
  --app-id "com.acmehealth.rcm" \
  --app-name "Acme Health RCM" \
  --platform ios

# Android only
./scripts/build-mobile.sh \
  --app-id "com.acmehealth.rcm" \
  --app-name "Acme Health RCM" \
  --platform android

# Both platforms with different iOS bundle ID
./scripts/build-mobile.sh \
  --app-id "com.acmehealth.rcm" \
  --app-name "Acme Health RCM" \
  --bundle-id "com.acmehealth.rcm.ios" \
  --platform both
```

### Windows PowerShell

For Windows users, use the PowerShell script:

```powershell
.\scripts\build-mobile.ps1 `
  -AppId "com.partner.rcm" `
  -AppName "Partner RCM" `
  -Platform "both"
```

---

## Capacitor Configuration

### Configuration File

Edit `packages/web/capacitor.config.ts`:

```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // Partner-specific app ID
  appId: 'com.partner.rcm',

  // Partner-specific app name
  appName: 'Partner RCM',

  // Directory containing the built web app
  webDir: 'out',

  // Server configuration
  server: {
    // For development, uncomment to use live reload:
    // url: 'http://localhost:3000',
    // cleartext: true,
  },

  // iOS-specific settings
  ios: {
    contentInset: 'automatic',
    allowsLinkPreview: true,
    scrollEnabled: true,
  },

  // Android-specific settings
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false, // Set true for debugging
  },

  // Plugin configurations
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#2563eb', // Partner primary color
      showSpinner: false,
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#2563eb', // Partner primary color
    },
  },
};

export default config;
```

### Environment-Based Configuration

For dynamic configuration based on partner:

```typescript
const partnerId = process.env.PARTNER_ID || 'default';

const partnerConfigs = {
  default: {
    appId: 'com.halcyon.rcm',
    appName: 'Halcyon RCM',
    primaryColor: '#2563eb',
  },
  acme: {
    appId: 'com.acmehealth.rcm',
    appName: 'Acme Health RCM',
    primaryColor: '#10B981',
  },
};

const partner = partnerConfigs[partnerId] || partnerConfigs.default;

const config: CapacitorConfig = {
  appId: partner.appId,
  appName: partner.appName,
  // ... rest of config
};
```

---

## iOS-Specific Configuration

### Project Structure

```
packages/web/ios/
├── App/
│   ├── App/
│   │   ├── Info.plist           # App configuration
│   │   ├── Assets.xcassets/     # App icons, images
│   │   └── capacitor.config.json
│   └── App.xcodeproj            # Xcode project
└── Podfile                      # CocoaPods dependencies
```

### Update Info.plist

Key settings in `ios/App/App/Info.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN">
<plist version="1.0">
<dict>
    <!-- App Display Name -->
    <key>CFBundleDisplayName</key>
    <string>Partner RCM</string>

    <!-- App Name -->
    <key>CFBundleName</key>
    <string>Partner RCM</string>

    <!-- Bundle Identifier (set in Xcode) -->
    <key>CFBundleIdentifier</key>
    <string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>

    <!-- Version -->
    <key>CFBundleShortVersionString</key>
    <string>1.0.0</string>

    <!-- Build Number -->
    <key>CFBundleVersion</key>
    <string>1</string>

    <!-- Required Device Capabilities -->
    <key>UIRequiredDeviceCapabilities</key>
    <array>
        <string>arm64</string>
    </array>

    <!-- App Transport Security (for HTTPS) -->
    <key>NSAppTransportSecurity</key>
    <dict>
        <key>NSAllowsArbitraryLoads</key>
        <false/>
    </dict>
</dict>
</plist>
```

### Xcode Configuration

1. **Open in Xcode:**
   ```bash
   npx cap open ios
   ```

2. **Set Bundle Identifier:**
   - Select the project in navigator
   - Select "App" target
   - Update "Bundle Identifier" in Signing & Capabilities

3. **Configure Signing:**
   - Select your Apple Developer Team
   - Enable automatic signing or configure manually

4. **Set Deployment Target:**
   - Minimum iOS version: 14.0 recommended

---

## Android-Specific Configuration

### Project Structure

```
packages/web/android/
├── app/
│   ├── src/main/
│   │   ├── AndroidManifest.xml
│   │   ├── java/com/partner/rcm/
│   │   ├── res/
│   │   │   ├── values/strings.xml
│   │   │   ├── mipmap-*/        # App icons
│   │   │   └── drawable/        # Splash screen
│   │   └── assets/
│   │       └── capacitor.config.json
│   └── build.gradle
├── build.gradle
└── settings.gradle
```

### Update build.gradle

Edit `android/app/build.gradle`:

```groovy
android {
    namespace "com.partner.rcm"

    defaultConfig {
        applicationId "com.partner.rcm"
        minSdkVersion 23
        targetSdkVersion 34
        versionCode 1
        versionName "1.0.0"
    }

    buildTypes {
        release {
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

### Update strings.xml

Edit `android/app/src/main/res/values/strings.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">Partner RCM</string>
    <string name="title_activity_main">Partner RCM</string>
    <string name="package_name">com.partner.rcm</string>
    <string name="custom_url_scheme">com.partner.rcm</string>
</resources>
```

### Android Studio Configuration

1. **Open in Android Studio:**
   ```bash
   npx cap open android
   ```

2. **Update Application ID:**
   - Open `app/build.gradle`
   - Update `applicationId`

3. **Configure Signing:**
   - Generate signing keystore
   - Configure in `build.gradle` or via GUI

---

## App Icons and Splash Screens

### Required Icon Sizes

**iOS:**
| Size | Filename | Usage |
|------|----------|-------|
| 1024x1024 | `AppIcon.png` | App Store |
| 180x180 | `AppIcon@3x.png` | iPhone (3x) |
| 120x120 | `AppIcon@2x.png` | iPhone (2x) |
| 167x167 | `AppIcon-83.5@2x.png` | iPad Pro |
| 152x152 | `AppIcon-76@2x.png` | iPad |

**Android:**
| Density | Size | Directory |
|---------|------|-----------|
| xxxhdpi | 192x192 | `mipmap-xxxhdpi` |
| xxhdpi | 144x144 | `mipmap-xxhdpi` |
| xhdpi | 96x96 | `mipmap-xhdpi` |
| hdpi | 72x72 | `mipmap-hdpi` |
| mdpi | 48x48 | `mipmap-mdpi` |

### Generating Icons

Use a tool like [Capacitor Assets](https://www.npmjs.com/package/@capacitor/assets):

```bash
# Install the tool
npm install -g @capacitor/assets

# Generate icons from a 1024x1024 source image
npx capacitor-assets generate --iconBackgroundColor '#2563eb' --splashBackgroundColor '#2563eb'
```

Or use online tools:
- [App Icon Generator](https://appicon.co/)
- [Icon Kitchen](https://icon.kitchen/)

### Splash Screen

Configure splash screen in `capacitor.config.ts`:

```typescript
plugins: {
  SplashScreen: {
    launchShowDuration: 2000,
    launchAutoHide: true,
    backgroundColor: '#2563eb',
    androidSplashResourceName: 'splash',
    androidScaleType: 'CENTER_CROP',
    showSpinner: false,
    iosSpinnerStyle: 'small',
    spinnerColor: '#ffffff',
  },
}
```

---

## Building for Release

### iOS Release Build

```bash
# 1. Build the web app
cd packages/web
npm run build:capacitor

# 2. Sync with iOS
npx cap sync ios

# 3. Open in Xcode
npx cap open ios

# 4. In Xcode:
#    - Select "Any iOS Device" as target
#    - Product > Archive
#    - Distribute App
```

### Android Release Build

```bash
# 1. Build the web app
cd packages/web
npm run build:capacitor

# 2. Sync with Android
npx cap sync android

# 3. Build release APK/AAB
cd android
./gradlew assembleRelease  # APK
./gradlew bundleRelease    # AAB (for Play Store)
```

**Output locations:**
- APK: `android/app/build/outputs/apk/release/app-release.apk`
- AAB: `android/app/build/outputs/bundle/release/app-release.aab`

---

## App Store Submission

### Apple App Store

**Requirements:**
- Apple Developer Program membership ($99/year)
- App Store Connect access
- App icons, screenshots, descriptions

**Submission Checklist:**
- [ ] App icon (1024x1024)
- [ ] Screenshots for all device sizes
- [ ] App description
- [ ] Privacy policy URL
- [ ] Support URL
- [ ] Age rating
- [ ] App Review information

**Healthcare App Requirements:**
- Privacy policy must cover PHI handling
- HIPAA compliance documentation may be requested
- May require medical purpose explanation

### Google Play Store

**Requirements:**
- Google Play Console account ($25 one-time)
- Signed AAB/APK
- App listing assets

**Submission Checklist:**
- [ ] App icon (512x512)
- [ ] Feature graphic (1024x500)
- [ ] Screenshots (min 2)
- [ ] Short description (80 chars)
- [ ] Full description (4000 chars)
- [ ] Privacy policy URL
- [ ] Content rating questionnaire

**Healthcare App Requirements:**
- Health apps may require additional review
- Must comply with Google Play policies for health apps
- May need to declare sensitive permissions usage

---

## Troubleshooting

### Build Fails: "API routes not supported"

**Cause:** Next.js static export doesn't support API routes.

**Solution:** The build script handles this automatically. If issues persist:

```bash
# Manually remove API routes before build
mv packages/web/src/app/api packages/web/.api-backup

# Build
npm run build

# Restore
mv packages/web/.api-backup packages/web/src/app/api
```

### iOS: "No signing certificate"

**Solution:**
1. Open Xcode > Preferences > Accounts
2. Add your Apple ID
3. Download certificates
4. In project settings, select your team

### Android: "SDK location not found"

**Solution:** Create `local.properties` in `android/`:

```properties
sdk.dir=/Users/username/Library/Android/sdk
# or on Windows:
# sdk.dir=C:\\Users\\username\\AppData\\Local\\Android\\Sdk
```

### App Shows White Screen

**Causes:**
1. Web assets not synced
2. JavaScript errors
3. Wrong `webDir` path

**Solutions:**
```bash
# Rebuild and sync
npm run build
npx cap sync

# Check for JS errors
npx cap run android --target <device-id>  # View logs
```

### Splash Screen Stuck

**Solution:** Ensure splash screen auto-hides:

```typescript
plugins: {
  SplashScreen: {
    launchAutoHide: true,
    launchShowDuration: 2000,
  },
}
```

Or manually hide in your app:

```typescript
import { SplashScreen } from '@capacitor/splash-screen';

// Hide splash screen when app is ready
SplashScreen.hide();
```

---

## Related Documentation

- [WHITE_LABEL_SETUP.md](./WHITE_LABEL_SETUP.md) - Overall setup guide
- [PARTNER_DEPLOYMENT.md](./PARTNER_DEPLOYMENT.md) - Deployment options
- [Capacitor Documentation](https://capacitorjs.com/docs)

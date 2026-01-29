#!/bin/bash

# White-label mobile app build script
# Usage: ./scripts/build-mobile.sh --app-id "com.partner.rcm" --app-name "Partner RCM" --platform "ios|android|both"

set -e

# Default values
APP_ID="com.rcmpartner.app"
APP_NAME="RCM Partner"
BUNDLE_ID=""
PLATFORM="both"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --app-id) APP_ID="$2"; shift 2 ;;
    --app-name) APP_NAME="$2"; shift 2 ;;
    --bundle-id) BUNDLE_ID="$2"; shift 2 ;;
    --platform) PLATFORM="$2"; shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

BUNDLE_ID="${BUNDLE_ID:-$APP_ID}"

echo "Building mobile app..."
echo "  App ID: $APP_ID"
echo "  App Name: $APP_NAME"
echo "  Bundle ID: $BUNDLE_ID"
echo "  Platform: $PLATFORM"

# Export for capacitor.config.ts
export MOBILE_APP_ID="$APP_ID"
export MOBILE_APP_NAME="$APP_NAME"

cd packages/web

# Build Next.js static export
npm run build

# Update Android config if building for Android
if [[ "$PLATFORM" == "android" || "$PLATFORM" == "both" ]]; then
  echo "Configuring Android..."

  # Update build.gradle
  sed -i "s/applicationId \".*\"/applicationId \"$APP_ID\"/" android/app/build.gradle

  # Update strings.xml
  sed -i "s/<string name=\"app_name\">.*<\/string>/<string name=\"app_name\">$APP_NAME<\/string>/" android/app/src/main/res/values/strings.xml

  # Sync and build
  npx cap sync android
  echo "Android configured. Run: npx cap open android"
fi

# Update iOS config if building for iOS
if [[ "$PLATFORM" == "ios" || "$PLATFORM" == "both" ]]; then
  echo "Configuring iOS..."

  # Update Info.plist
  /usr/libexec/PlistBuddy -c "Set :CFBundleDisplayName $APP_NAME" ios/App/App/Info.plist 2>/dev/null || true
  /usr/libexec/PlistBuddy -c "Set :CFBundleName $APP_NAME" ios/App/App/Info.plist 2>/dev/null || true

  # Sync
  npx cap sync ios
  echo "iOS configured. Run: npx cap open ios"
fi

echo "Mobile build complete!"

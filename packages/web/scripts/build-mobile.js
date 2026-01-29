#!/usr/bin/env node

/**
 * White-label mobile app build script
 *
 * This script builds the Next.js app for Capacitor and configures
 * the native projects with white-label app identifiers.
 *
 * Usage:
 *   node scripts/build-mobile.js --app-id "com.partner.rcm" --app-name "Partner RCM" --platform "ios|android|both"
 *
 * Environment variables:
 *   MOBILE_APP_ID - Application identifier (e.g., com.partner.rcm)
 *   MOBILE_APP_NAME - Display name for the app
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  appId: process.env.MOBILE_APP_ID || 'com.rcmpartner.app',
  appName: process.env.MOBILE_APP_NAME || 'RCM Partner',
  bundleId: '',
  platform: 'both'
};

for (let i = 0; i < args.length; i += 2) {
  const flag = args[i];
  const value = args[i + 1];

  switch (flag) {
    case '--app-id':
      options.appId = value;
      break;
    case '--app-name':
      options.appName = value;
      break;
    case '--bundle-id':
      options.bundleId = value;
      break;
    case '--platform':
      options.platform = value;
      break;
    default:
      if (flag && flag.startsWith('--')) {
        console.error(`Unknown option: ${flag}`);
        process.exit(1);
      }
  }
}

// Bundle ID defaults to app ID if not specified
options.bundleId = options.bundleId || options.appId;

// Set environment variables for capacitor.config.ts
process.env.MOBILE_APP_ID = options.appId;
process.env.MOBILE_APP_NAME = options.appName;

const webDir = path.join(__dirname, '..');
const appDir = path.join(webDir, 'src', 'app');
const apiDir = path.join(appDir, 'api');
const apiBackupDir = path.join(webDir, '.api-backup');

function moveDir(src, dest) {
  if (fs.existsSync(src)) {
    const destParent = path.dirname(dest);
    if (!fs.existsSync(destParent)) {
      fs.mkdirSync(destParent, { recursive: true });
    }
    fs.renameSync(src, dest);
    console.log(`Moved ${src} to ${dest}`);
    return true;
  }
  return false;
}

function restoreApi() {
  if (fs.existsSync(apiBackupDir)) {
    moveDir(apiBackupDir, apiDir);
    console.log('API routes restored');
  }
}

// Handle cleanup on exit
process.on('exit', restoreApi);
process.on('SIGINT', () => {
  restoreApi();
  process.exit(1);
});
process.on('SIGTERM', () => {
  restoreApi();
  process.exit(1);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  restoreApi();
  process.exit(1);
});

function updateAndroidConfig(appId, appName) {
  const buildGradlePath = path.join(webDir, 'android', 'app', 'build.gradle');
  const stringsXmlPath = path.join(webDir, 'android', 'app', 'src', 'main', 'res', 'values', 'strings.xml');

  if (fs.existsSync(buildGradlePath)) {
    let content = fs.readFileSync(buildGradlePath, 'utf8');
    content = content.replace(/applicationId ".*"/, `applicationId "${appId}"`);
    fs.writeFileSync(buildGradlePath, content);
    console.log(`Updated Android applicationId to: ${appId}`);
  }

  if (fs.existsSync(stringsXmlPath)) {
    let content = fs.readFileSync(stringsXmlPath, 'utf8');
    content = content.replace(/<string name="app_name">.*<\/string>/, `<string name="app_name">${appName}</string>`);
    fs.writeFileSync(stringsXmlPath, content);
    console.log(`Updated Android app_name to: ${appName}`);
  }
}

function updateIosConfig(appName) {
  const infoPlistPath = path.join(webDir, 'ios', 'App', 'App', 'Info.plist');

  if (fs.existsSync(infoPlistPath)) {
    let content = fs.readFileSync(infoPlistPath, 'utf8');

    // Update CFBundleDisplayName
    content = content.replace(
      /(<key>CFBundleDisplayName<\/key>\s*<string>).*(<\/string>)/,
      `$1${appName}$2`
    );

    // Update CFBundleName
    content = content.replace(
      /(<key>CFBundleName<\/key>\s*<string>).*(<\/string>)/,
      `$1${appName}$2`
    );

    fs.writeFileSync(infoPlistPath, content);
    console.log(`Updated iOS app name to: ${appName}`);
  }
}

async function main() {
  console.log('=== White-Label Mobile Build Script ===\n');
  console.log('Configuration:');
  console.log(`  App ID: ${options.appId}`);
  console.log(`  App Name: ${options.appName}`);
  console.log(`  Bundle ID: ${options.bundleId}`);
  console.log(`  Platform: ${options.platform}`);
  console.log('');

  // Step 1: Move API routes out of the way
  console.log('Step 1: Temporarily moving API routes...');
  if (fs.existsSync(apiBackupDir)) {
    fs.rmSync(apiBackupDir, { recursive: true });
  }
  const apiMoved = moveDir(apiDir, apiBackupDir);
  if (apiMoved) {
    console.log('API routes moved to backup location\n');
  } else {
    console.log('No API routes found, skipping\n');
  }

  // Step 2: Run Next.js build with static export
  console.log('Step 2: Building Next.js for static export...');
  try {
    const env = {
      ...process.env,
      CAPACITOR_BUILD: 'true',
      MOBILE_APP_ID: options.appId,
      MOBILE_APP_NAME: options.appName
    };
    execSync('npx next build', {
      cwd: webDir,
      stdio: 'inherit',
      env
    });
    console.log('\nBuild completed successfully!\n');
  } catch (error) {
    console.error('\nBuild failed!');
    throw error;
  }

  // Step 3: Restore API routes
  console.log('Step 3: Restoring API routes...');
  restoreApi();

  // Step 4: Configure and sync native platforms
  if (options.platform === 'android' || options.platform === 'both') {
    console.log('\nStep 4a: Configuring Android...');
    updateAndroidConfig(options.appId, options.appName);

    try {
      execSync('npx cap sync android', {
        cwd: webDir,
        stdio: 'inherit',
        env: process.env
      });
      console.log('Android configured. Run: npx cap open android');
    } catch (error) {
      console.error('Android sync failed:', error.message);
    }
  }

  if (options.platform === 'ios' || options.platform === 'both') {
    console.log('\nStep 4b: Configuring iOS...');
    updateIosConfig(options.appName);

    try {
      execSync('npx cap sync ios', {
        cwd: webDir,
        stdio: 'inherit',
        env: process.env
      });
      console.log('iOS configured. Run: npx cap open ios');
    } catch (error) {
      console.error('iOS sync failed:', error.message);
    }
  }

  console.log('\n=== Mobile Build Complete ===');
  console.log('Static files are in the "out" directory');
}

main().catch((err) => {
  console.error('Build script failed:', err);
  process.exit(1);
});

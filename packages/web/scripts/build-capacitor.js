#!/usr/bin/env node

/**
 * Build script for Capacitor (iOS/Android) static export
 *
 * This script temporarily moves the API routes out of the app directory
 * since Next.js static export doesn't support API routes.
 * After the build, it restores the API routes.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const appDir = path.join(__dirname, '..', 'src', 'app');
const apiDir = path.join(appDir, 'api');
const apiBackupDir = path.join(__dirname, '..', '.api-backup');

function moveDir(src, dest) {
  if (fs.existsSync(src)) {
    // Ensure destination parent exists
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

async function main() {
  console.log('=== Capacitor Build Script ===\n');

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
    // Set environment variable and run build
    const env = { ...process.env, CAPACITOR_BUILD: 'true' };
    execSync('npx next build', {
      cwd: path.join(__dirname, '..'),
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

  console.log('\n=== Build Complete ===');
  console.log('Static files are in the "out" directory');
  console.log('Run "npm run cap:sync" to sync with native platforms');
}

main().catch((err) => {
  console.error('Build script failed:', err);
  process.exit(1);
});

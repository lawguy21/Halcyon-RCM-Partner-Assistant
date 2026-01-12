#!/usr/bin/env node
/**
 * Database initialization script
 * Runs prisma db push before starting the main server
 */

import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('=== Halcyon RCM API Database Initialization ===');
console.log('Current directory:', process.cwd());
console.log('DATABASE_URL set:', !!process.env.DATABASE_URL);

// Check if schema exists
const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma');
if (!fs.existsSync(schemaPath)) {
    console.error('ERROR: Schema file not found at:', schemaPath);
    process.exit(1);
}
console.log('Schema file found at:', schemaPath);

// Run prisma db push
try {
    console.log('\n=== Running prisma db push ===');
    execSync('npx prisma db push --skip-generate --accept-data-loss', {
        stdio: 'inherit',
        env: process.env
    });
    console.log('=== Database sync completed successfully ===\n');
} catch (error) {
    console.error('ERROR: prisma db push failed:', error.message);
    // Continue anyway - tables might already exist
    console.log('Continuing with server startup...');
}

// Start the main server
console.log('=== Starting main server ===');
const { startServer } = await import('./dist/index.js');
startServer();

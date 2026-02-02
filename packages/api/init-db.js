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
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('DATABASE_URL set:', !!process.env.DATABASE_URL);

// Check if schema exists
const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma');
if (fs.existsSync(schemaPath)) {
    console.log('Schema file found at:', schemaPath);
} else {
    console.warn('WARNING: Schema file not found at:', schemaPath);
    console.warn('Skipping database initialization...');
}

// Run prisma db push only if DATABASE_URL is set
if (process.env.DATABASE_URL) {
    try {
        console.log('\n=== Running prisma db push ===');
        execSync('npx prisma db push --skip-generate --accept-data-loss', {
            stdio: 'inherit',
            env: process.env,
            timeout: 30000 // 30 second timeout
        });
        console.log('=== Database sync completed successfully ===\n');
    } catch (error) {
        console.error('WARNING: prisma db push failed:', error.message);
        console.log('Continuing with server startup...');
    }
} else {
    console.warn('WARNING: DATABASE_URL not set - skipping database initialization');
    console.warn('Some features requiring database will not work');
}

// Start the main server
console.log('=== Starting main server ===');
try {
    const { startServer } = await import('./dist/index.js');
    await startServer();
} catch (error) {
    console.error('FATAL: Failed to start server:', error);
    process.exit(1);
}

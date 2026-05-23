// index.js - Main Test Runner
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
export const WORKER_URL = (process.env.WORKER_URL || 'http://localhost:8787').replace(/\/$/, '');
export const API_KEY = process.env.API_KEY;

// Test image URLs
export const TEST_IMAGES = {
    supabase: 'https://ndakfssfdggzxxfixpej.supabase.co/storage/v1/object/public/stats-m-image-gallery/property-images/1778762809282-88fsml0.jpg',
    statusm: 'https://statusm.me/wp-content/uploads/2025/01/status4.jpg',
    public: 'https://picsum.photos/id/1015/800/600.jpg'
};

export const TEST_PROPERTY_ID = 99999;
export const PROXY_URLS = {
    local: 'http://localhost:8080',
    cloudflare: 'https://prus-api4.burgas275.workers.dev'
};

// Colors for console output
export const colors = {
    reset: '\x1b[0m', bright: '\x1b[1m', dim: '\x1b[2m',
    red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m',
    blue: '\x1b[34m', magenta: '\x1b[35m', cyan: '\x1b[36m'
};

export function log(color, prefix, message, data = null) {
    console.log(`${color}[${prefix}]${colors.reset} ${message}`);
    if (data) console.log(`${colors.dim}${JSON.stringify(data, null, 2)}${colors.reset}`);
}

export function logSuccess(m, d) { log(colors.green, '✓', m, d); }
export function logError(m, d) { log(colors.red, '✗', m, d); }
export function logInfo(m, d) { log(colors.blue, 'ℹ', m, d); }
export function logWarn(m, d) { log(colors.yellow, '⚠', m, d); }
export function logSection(title) {
    console.log(`\n${colors.bright}${colors.cyan}═══════════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}  ${title}${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}═══════════════════════════════════════════════════════════════${colors.reset}`);
}

// Check API key
if (!API_KEY) {
    console.error('❌ ERROR: API_KEY not found in .env file!');
    process.exit(1);
}

console.log(`✅ Loaded configuration:`);
console.log(`   WORKER_URL: ${WORKER_URL}`);
console.log(`   API_KEY: ${API_KEY.substring(0, 10)}... (${API_KEY.length} chars)`);

// Import all test modules
import { runBasicTests } from './tests/01-basic.test.js';
import { runCacheTests } from './tests/02-cache-operations.test.js';
import { runKvMappingTests } from './tests/03-kv-mappings.test.js';
import { runPropertyTests } from './tests/04-property-images.test.js';
import { runLocalFileTests } from './tests/05-local-file.test.js';
import { runProxyTests } from './tests/06-proxy-tests.test.js';
import { runCleanupTests } from './tests/07-cleanup.test.js';

// Main test runner
async function runAllTests() {
    console.log(`${colors.bright}${colors.magenta}`);
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║     IMAGE CACHE WORKER - COMPLETE TEST SUITE                  ║');
    console.log(`║     Target: ${WORKER_URL}`);
    console.log('╚═══════════════════════════════════════════════════════════════╝');
    console.log(`${colors.reset}`);

    let allResults = [];

    // Run test sections
    allResults = allResults.concat(await runBasicTests());
    allResults = allResults.concat(await runCacheTests());
    allResults = allResults.concat(await runKvMappingTests());
    allResults = allResults.concat(await runPropertyTests());
    allResults = allResults.concat(await runLocalFileTests());
    allResults = allResults.concat(await runProxyTests());
    allResults = allResults.concat(await runCleanupTests());

    // Summary
    logSection('TEST SUMMARY');
    const passed = allResults.filter(r => r.passed).length;
    const failed = allResults.filter(r => !r.passed).length;

    console.log(`\n${colors.bright}Results:${colors.reset}`);
    allResults.forEach(r => {
        const icon = r.passed ? `${colors.green}✓${colors.reset}` : `${colors.red}✗${colors.reset}`;
        console.log(`  ${icon} ${r.name}`);
    });

    console.log(`\n${colors.bright}Total: ${passed} passed, ${failed} failed${colors.reset}`);

    if (failed === 0) {
        console.log(`\n${colors.green}${colors.bright}🎉 All tests passed! Worker is fully functional.${colors.reset}`);
    } else {
        console.log(`\n${colors.red}${colors.bright}⚠️ ${failed} tests failed. Please review.${colors.reset}`);
    }

    return { passed, failed };
}

// Run tests
runAllTests().catch(console.error);
// tests/03-kv-mappings.test.js
import axios from 'axios';
import { WORKER_URL, API_KEY, TEST_IMAGES, logSuccess, logError, logInfo, logWarn, logSection } from '../index.js';

export async function runKvMappingTests() {
    const results = [];

    logSection('SECTION 3: KV Mappings');

    // Test 12: List URL Mappings
    try {
        const response = await axios.get(`${WORKER_URL}/cache/mappings`, {
            params: { limit: 10 },
            headers: { 'X-API-Key': API_KEY }
        });
        logSuccess(`Found ${response.data.totalInThisPage} mappings`);
        results.push({ name: '12. List URL Mappings', passed: true });
    } catch (error) {
        logError(`List mappings failed: ${error.message}`);
        results.push({ name: '12. List URL Mappings', passed: false });
    }

    // Test 13: Get URL Mapping
    try {
        const response = await axios.get(`${WORKER_URL}/cache/mapping`, {
            params: { url: TEST_IMAGES.public },
            headers: { 'X-API-Key': API_KEY }
        });
        logSuccess(`Mapping found: ${response.data.cacheKey?.substring(0, 40)}...`);
        results.push({ name: '13. Get URL Mapping', passed: true });
    } catch (error) {
        if (error.response?.status === 404) {
            logWarn(`No mapping found (expected if first run)`);
            results.push({ name: '13. Get URL Mapping', passed: true });
        } else {
            logError(`Get mapping failed: ${error.message}`);
            results.push({ name: '13. Get URL Mapping', passed: false });
        }
    }

    // Test 14: KV Statistics
    try {
        const response = await axios.get(`${WORKER_URL}/cache/kv-stats`, {
            headers: { 'X-API-Key': API_KEY }
        });
        logSuccess(`Total mappings: ${response.data.totalMappings}`);
        results.push({ name: '14. KV Statistics', passed: true });
    } catch (error) {
        logError(`KV stats failed: ${error.message}`);
        results.push({ name: '14. KV Statistics', passed: false });
    }

    return results;
}
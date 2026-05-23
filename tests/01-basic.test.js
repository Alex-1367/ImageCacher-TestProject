// tests/01-basic.test.js
import axios from 'axios';
import { WORKER_URL, API_KEY, logSuccess, logError, logInfo, logWarn, logSection, colors } from '../index.js';

export async function runBasicTests() {
    const results = [];

    logSection('SECTION 1: Basic Worker Tests');

    // Test 1: Health Check
    try {
        const response = await axios.get(`${WORKER_URL}/cache/health`);
        logSuccess(`Health check passed (${response.status})`);
        results.push({ name: '1. Health Check', passed: true });
    } catch (error) {
        logError(`Health check failed: ${error.message}`);
        results.push({ name: '1. Health Check', passed: false });
    }

    // Test 2: Diagnostics
    try {
        const response = await axios.get(`${WORKER_URL}/cache/diagnostics`);
        const r2Accessible = response.data.r2?.bucketAccessible;
        logSuccess(`Diagnostics retrieved, R2 accessible: ${r2Accessible}`);
        results.push({ name: '2. Diagnostics', passed: r2Accessible === true });
    } catch (error) {
        logError(`Diagnostics failed: ${error.message}`);
        results.push({ name: '2. Diagnostics', passed: false });
    }

    // Test 3: CORS Headers
    try {
        const response = await axios.options(`${WORKER_URL}/cache/health`);
        logSuccess(`CORS preflight passed`);
        results.push({ name: '3. CORS Headers', passed: true });
    } catch (error) {
        logError(`CORS test failed: ${error.message}`);
        results.push({ name: '3. CORS Headers', passed: false });
    }

    // Test 4: Unauthorized Access
    try {
        await axios.post(`${WORKER_URL}/cache/image`, 
            { imageUrl: 'https://example.com/test.jpg' },
            { headers: { 'X-API-Key': 'wrong-key' } }
        );
        logError(`Should have failed with 401`);
        results.push({ name: '4. Unauthorized Access', passed: false });
    } catch (error) {
        const passed = error.response?.status === 401;
        if (passed) logSuccess(`Unauthorized correctly rejected (401)`);
        else logError(`Expected 401, got ${error.response?.status}`);
        results.push({ name: '4. Unauthorized Access', passed });
    }

    return results;
}
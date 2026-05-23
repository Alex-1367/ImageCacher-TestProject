// tests/02-cache-operations.test.js
import axios from 'axios';
import { WORKER_URL, API_KEY, TEST_IMAGES, logSuccess, logError, logInfo, logWarn, logSection } from '../index.js';

let uploadedKeys = [];

export async function runCacheTests() {
    const results = [];

    logSection('SECTION 2: Cache Operations');

    // Test 5: Cache Status
    try {
        const response = await axios.get(`${WORKER_URL}/cache/status`, {
            params: { url: TEST_IMAGES.public },
            headers: { 'X-API-Key': API_KEY }
        });
        logSuccess(`Cache status: ${response.data.cached ? 'CACHED' : 'NOT CACHED'}`);
        results.push({ name: '5. Cache Status', passed: true });
    } catch (error) {
        logError(`Cache status failed: ${error.message}`);
        results.push({ name: '5. Cache Status', passed: false });
    }

    // Test 6: Single Upload
    let uploadResult = null;
    try {
        const response = await axios.post(`${WORKER_URL}/cache/image`, {
            imageUrl: TEST_IMAGES.public,
            propertyId: 99999,
            imageIndex: 0,
            forceUpdate: false
        }, { headers: { 'X-API-Key': API_KEY } });
        
        uploadResult = response.data;
        logSuccess(`Upload successful: ${uploadResult.status}`);
        logInfo(`Key: ${uploadResult.key}`);
        if (uploadResult.key) uploadedKeys.push(uploadResult.key);
        results.push({ name: '6. Single Upload', passed: true });
    } catch (error) {
        logError(`Upload failed: ${error.message}`);
        results.push({ name: '6. Single Upload', passed: false });
    }

    // Test 7: Serve Image
    if (uploadResult?.key) {
        try {
            const response = await axios.get(`${WORKER_URL}/image/${uploadResult.key}`, {
                responseType: 'arraybuffer'
            });
            logSuccess(`Image served (${response.data.byteLength} bytes)`);
            results.push({ name: '7. Serve Image', passed: true });
        } catch (error) {
            logError(`Serve failed: ${error.message}`);
            results.push({ name: '7. Serve Image', passed: false });
        }
    } else {
        results.push({ name: '7. Serve Image', passed: false });
    }

    // Test 8: Batch Upload
    try {
        const response = await axios.post(`${WORKER_URL}/cache/images`, {
            images: [TEST_IMAGES.supabase, TEST_IMAGES.public],
            skipExisting: true
        }, { headers: { 'X-API-Key': API_KEY } });
        
        logSuccess(`Batch: ${response.data.summary.cached} cached, ${response.data.summary.skipped} skipped`);
        results.push({ name: '8. Batch Upload', passed: response.data.summary.cached > 0 });
    } catch (error) {
        logError(`Batch upload failed: ${error.message}`);
        results.push({ name: '8. Batch Upload', passed: false });
    }

    // Test 9: Get Image Info
    if (uploadResult?.key) {
        try {
            const response = await axios.get(`${WORKER_URL}/cache/image-info`, {
                params: { key: uploadResult.key },
                headers: { 'X-API-Key': API_KEY }
            });
            logSuccess(`Image info: ${response.data.sizeKB} KB`);
            results.push({ name: '9. Get Image Info', passed: true });
        } catch (error) {
            logError(`Get info failed: ${error.message}`);
            results.push({ name: '9. Get Image Info', passed: false });
        }
    } else {
        results.push({ name: '9. Get Image Info', passed: false });
    }

    // Test 10: Cache Statistics
    try {
        const response = await axios.get(`${WORKER_URL}/cache/stats`, {
            headers: { 'X-API-Key': API_KEY }
        });
        logSuccess(`Total images in cache: ${response.data.totalImages}`);
        logInfo(`Total size: ${response.data.totalSizeMB} MB`);
        results.push({ name: '10. Cache Statistics', passed: true });
    } catch (error) {
        logError(`Stats failed: ${error.message}`);
        results.push({ name: '10. Cache Statistics', passed: false });
    }

    // Test 11: List Cached Images
    try {
        const response = await axios.get(`${WORKER_URL}/cache/list`, {
            params: { limit: 10 },
            headers: { 'X-API-Key': API_KEY }
        });
        logSuccess(`Found ${response.data.totalInThisPage} images`);
        results.push({ name: '11. List Cached Images', passed: true });
    } catch (error) {
        logError(`List failed: ${error.message}`);
        results.push({ name: '11. List Cached Images', passed: false });
    }

    return results;
}

export { uploadedKeys };
// tests/07-cleanup.test.js
import axios from 'axios';
import { WORKER_URL, API_KEY, TEST_IMAGES, TEST_PROPERTY_ID, logSuccess, logError, logInfo, logWarn, logSection } from '../index.js';

export async function runCleanupTests() {
    const results = [];

    logSection('SECTION 7: Cleanup Operations');

    // Test 26: Delete Single Image
    try {
        // Get a cached image key first
        const listResponse = await axios.get(`${WORKER_URL}/cache/list`, {
            params: { limit: 1 },
            headers: { 'X-API-Key': API_KEY }
        });
        
        if (listResponse.data.images?.length > 0) {
            const imageKey = listResponse.data.images[0].key;
            const response = await axios.delete(`${WORKER_URL}/cache/image`, {
                params: { key: imageKey },
                headers: { 'X-API-Key': API_KEY }
            });
            logSuccess(`Deleted image: ${response.data.cacheKey}`);
            results.push({ name: '26. Delete Single Image', passed: true });
        } else {
            logWarn(`No images to delete`);
            results.push({ name: '26. Delete Single Image', passed: 'skipped (no images)' });
        }
    } catch (error) {
        logError(`Delete single image failed: ${error.message}`);
        results.push({ name: '26. Delete Single Image', passed: false });
    }

    // Test 27: Delete Property Images (When Sold)
    try {
        const response = await axios.delete(`${WORKER_URL}/cache/property-images`, {
            params: { propertyId: TEST_PROPERTY_ID },
            headers: { 'X-API-Key': API_KEY }
        });
        logSuccess(`Deleted ${response.data.deletedCount} images for property ${TEST_PROPERTY_ID}`);
        results.push({ name: '27. Delete Property Images (Sold)', passed: true });
    } catch (error) {
        logError(`Delete property images failed: ${error.message}`);
        results.push({ name: '27. Delete Property Images (Sold)', passed: false });
    }

    // Test 28: Delete URL Mapping
    try {
        const response = await axios.delete(`${WORKER_URL}/cache/mapping`, {
            params: { url: TEST_IMAGES.public },
            headers: { 'X-API-Key': API_KEY }
        });
        logSuccess(`Deleted mapping for URL`);
        results.push({ name: '28. Delete URL Mapping', passed: true });
    } catch (error) {
        if (error.response?.status === 404) {
            logWarn(`No mapping found to delete`);
            results.push({ name: '28. Delete URL Mapping', passed: true });
        } else {
            logError(`Delete mapping failed: ${error.message}`);
            results.push({ name: '28. Delete URL Mapping', passed: false });
        }
    }

    // Test 29: Clear Old Cache
    try {
        const response = await axios.delete(`${WORKER_URL}/cache/images`, {
            params: { olderThanDays: 1 },
            headers: { 'X-API-Key': API_KEY }
        });
        logSuccess(`Cleared ${response.data.deleted} old images`);
        results.push({ name: '29. Clear Old Cache', passed: true });
    } catch (error) {
        logError(`Clear cache failed: ${error.message}`);
        results.push({ name: '29. Clear Old Cache', passed: false });
    }

    return results;
}
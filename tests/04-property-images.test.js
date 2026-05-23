// tests/04-property-images.test.js
import axios from 'axios';
import { WORKER_URL, API_KEY, TEST_IMAGES, TEST_PROPERTY_ID, logSuccess, logError, logInfo, logWarn, logSection } from '../index.js';

export async function runPropertyTests() {
    const results = [];

    logSection('SECTION 4: Property Images');

    // Test 15: Upload with Property ID
    let uploadResult = null;
    try {
        const response = await axios.post(`${WORKER_URL}/cache/image`, {
            imageUrl: TEST_IMAGES.supabase,
            propertyId: TEST_PROPERTY_ID,
            imageIndex: 0,
            forceUpdate: false
        }, { headers: { 'X-API-Key': API_KEY } });
        
        uploadResult = response.data;
        logSuccess(`Uploaded with property ID ${TEST_PROPERTY_ID}`);
        logInfo(`Key: ${uploadResult.key}`);
        results.push({ name: '15. Upload with Property ID', passed: true });
    } catch (error) {
        logError(`Upload failed: ${error.message}`);
        results.push({ name: '15. Upload with Property ID', passed: false });
    }

    // Test 16: Get Property Images
    try {
        const response = await axios.get(`${WORKER_URL}/cache/property-images`, {
            params: { propertyId: TEST_PROPERTY_ID },
            headers: { 'X-API-Key': API_KEY }
        });
        logSuccess(`Property ${TEST_PROPERTY_ID} has ${response.data.totalCount} images`);
        results.push({ name: '16. Get Property Images', passed: true });
    } catch (error) {
        logError(`Get property images failed: ${error.message}`);
        results.push({ name: '16. Get Property Images', passed: false });
    }

    // Test 17: Property Batch Upload
    try {
        const response = await axios.post(`${WORKER_URL}/cache/property-images`, {
            propertyId: TEST_PROPERTY_ID + 1,
            images: [
                { url: TEST_IMAGES.public, index: 0 },
                { url: TEST_IMAGES.supabase, index: 1 }
            ]
        }, { headers: { 'X-API-Key': API_KEY } });
        
        logSuccess(`Property batch: ${response.data.summary.cached} cached`);
        results.push({ name: '17. Property Batch Upload', passed: response.data.summary.cached > 0 });
    } catch (error) {
        logError(`Property batch failed: ${error.message}`);
        results.push({ name: '17. Property Batch Upload', passed: false });
    }

    return results;
}
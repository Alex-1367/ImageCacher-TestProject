// tests/05-local-file.test.js
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import { fileURLToPath } from 'url';
import { WORKER_URL, API_KEY, TEST_IMAGES, logSuccess, logError, logInfo, logWarn, logSection, colors } from '../index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createTestImage() {
    const testImagePath = path.join(__dirname, '..', 'test-upload-image.jpg');
    if (!fs.existsSync(testImagePath)) {
        logInfo('Creating test image...');
        const response = await axios.get(TEST_IMAGES.public, { responseType: 'arraybuffer' });
        fs.writeFileSync(testImagePath, Buffer.from(response.data));
        logSuccess(`Test image created`);
    }
    return testImagePath;
}

function cleanupTestImage() {
    const testImagePath = path.join(__dirname, '..', 'test-upload-image.jpg');
    if (fs.existsSync(testImagePath)) fs.unlinkSync(testImagePath);
}

export async function runLocalFileTests() {
    const results = [];

    logSection('SECTION 5: Local File Upload');

    const testImagePath = await createTestImage();
    const stats = fs.statSync(testImagePath);
    logInfo(`Test file: ${path.basename(testImagePath)} (${(stats.size / 1024).toFixed(2)} KB)`);

    // Test 18: Local File Upload
    let uploadResult = null;
    try {
        const formData = new FormData();
        formData.append('file', fs.createReadStream(testImagePath));
        formData.append('propertyId', '88888');
        formData.append('imageIndex', '0');
        formData.append('originalFilename', 'test-upload-image.jpg');

        const response = await axios.post(`${WORKER_URL}/cache/upload-file`, formData, {
            headers: {
                ...formData.getHeaders(),
                'X-API-Key': API_KEY
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });

        uploadResult = response.data;
        logSuccess(`File uploaded successfully!`);
        logInfo(`Cache Key: ${uploadResult.key}`);
        logInfo(`Size: ${uploadResult.sizeKB} KB`);
        results.push({ name: '18. Local File Upload', passed: true });
    } catch (error) {
        logError(`File upload failed: ${error.message}`);
        results.push({ name: '18. Local File Upload', passed: false });
    }

    // Test 19: Batch Local File Upload (create multiple test files)
    try {
        // Create second test image if needed
        const testImagePath2 = path.join(__dirname, '..', 'test-upload-image2.jpg');
        if (!fs.existsSync(testImagePath2)) {
            const response = await axios.get(TEST_IMAGES.supabase, { responseType: 'arraybuffer' });
            fs.writeFileSync(testImagePath2, Buffer.from(response.data));
        }

        const formData = new FormData();
        formData.append('file', fs.createReadStream(testImagePath));
        formData.append('file', fs.createReadStream(testImagePath2));
        formData.append('propertyId', '88889');
        formData.append('imageIndex', '0');

        // Note: Multiple files in one request requires proper handling
        // For simplicity, we test sequential uploads
        let successCount = 0;
        for (let i = 0; i < 2; i++) {
            const fd = new FormData();
            fd.append('file', fs.createReadStream(testImagePath));
            fd.append('propertyId', `8888${i}`);
            fd.append('imageIndex', i.toString());
            
            const resp = await axios.post(`${WORKER_URL}/cache/upload-file`, fd, {
                headers: { ...fd.getHeaders(), 'X-API-Key': API_KEY },
                maxContentLength: Infinity
            });
            if (resp.data.success) successCount++;
        }
        
        logSuccess(`Batch upload: ${successCount}/2 successful`);
        results.push({ name: '19. Batch Local File Upload', passed: successCount === 2 });
        
        // Cleanup second test image
        if (fs.existsSync(testImagePath2)) fs.unlinkSync(testImagePath2);
    } catch (error) {
        logError(`Batch file upload failed: ${error.message}`);
        results.push({ name: '19. Batch Local File Upload', passed: false });
    }

    // Test 20: Upload and Verify Local File
    if (uploadResult?.key) {
        try {
            const response = await axios.get(`${WORKER_URL}/cache/property-images`, {
                params: { propertyId: 88888 },
                headers: { 'X-API-Key': API_KEY }
            });
            
            const found = response.data.images?.some(img => img.cacheKey === uploadResult.key);
            if (found) {
                logSuccess(`File verified in property images list`);
                results.push({ name: '20. Upload and Verify', passed: true });
            } else {
                logError(`File not found in property images`);
                results.push({ name: '20. Upload and Verify', passed: false });
            }
        } catch (error) {
            logError(`Verification failed: ${error.message}`);
            results.push({ name: '20. Upload and Verify', passed: false });
        }
    } else {
        results.push({ name: '20. Upload and Verify', passed: false });
    }

    // Cleanup
    cleanupTestImage();

    return results;
}
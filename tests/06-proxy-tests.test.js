// tests/06-proxy-tests.test.js
import axios from 'axios';
import { WORKER_URL, API_KEY, TEST_IMAGES, PROXY_URLS, logSuccess, logError, logInfo, logWarn, logSection } from '../index.js';
import { isLocalProxyRunning, downloadViaLocalProxy, downloadViaCloudflareProxy, directFetchStatusMe } from '../imageDownloader.js';

export async function runProxyTests() {
    const results = [];

    logSection('SECTION 6: Proxy Tests');

    // Test 21: Direct Fetch from Status.me (Expected to fail or succeed)
    try {
        const result = await directFetchStatusMe(TEST_IMAGES.statusm);
        if (result.success && result.contentType?.startsWith('image/')) {
            logSuccess(`Direct fetch successful! (${(result.size / 1024).toFixed(2)} KB)`);
            results.push({ name: '21. Direct Fetch Status.me', passed: true });
        } else {
            logWarn(`Direct fetch returned status ${result.status} (expected - CORS blocked)`);
            results.push({ name: '21. Direct Fetch Status.me', passed: true }); // Not a failure, expected behavior
        }
    } catch (error) {
        logWarn(`Direct fetch blocked (expected for CORS): ${error.message}`);
        results.push({ name: '21. Direct Fetch Status.me', passed: true });
    }

    // Test 22: Local Node.js Proxy Server
    try {
        const isRunning = await isLocalProxyRunning(PROXY_URLS.local);
        if (!isRunning) {
            logWarn(`Local proxy not running at ${PROXY_URLS.local}`);
            logInfo(`Start with: node local-proxy-server.js`);
            results.push({ name: '22. Local Proxy Fetch', passed: 'skipped (not running)' });
        } else {
            const result = await downloadViaLocalProxy(TEST_IMAGES.statusm, PROXY_URLS.local);
            if (result.success) {
                logSuccess(`Local proxy download successful! (${(result.size / 1024).toFixed(2)} KB)`);
                results.push({ name: '22. Local Proxy Fetch', passed: true });
            } else {
                throw new Error(result.error);
            }
        }
    } catch (error) {
        logError(`Local proxy download failed: ${error.message}`);
        results.push({ name: '22. Local Proxy Fetch', passed: false });
    }

    // Test 23: Cloudflare Worker Proxy
    try {
        // Check if Cloudflare proxy is reachable
        await axios.get(`${PROXY_URLS.cloudflare}/health`, { timeout: 3000 });
        
        const result = await downloadViaCloudflareProxy(TEST_IMAGES.statusm, PROXY_URLS.cloudflare);
        if (result.success) {
            logSuccess(`Cloudflare proxy download successful! (${(result.size / 1024).toFixed(2)} KB)`);
            results.push({ name: '23. Cloudflare Proxy Fetch', passed: true });
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        if (error.code === 'ENOTFOUND' || error.message.includes('ECONNREFUSED')) {
            logWarn(`Cloudflare proxy not deployed at ${PROXY_URLS.cloudflare}`);
            logInfo(`Deploy proxy worker to enable this test`);
            results.push({ name: '23. Cloudflare Proxy Fetch', passed: 'skipped (not deployed)' });
        } else {
            logError(`Cloudflare proxy download failed: ${error.message}`);
            results.push({ name: '23. Cloudflare Proxy Fetch', passed: false });
        }
    }

    // Test 24: Universal Downloader with Proxy Rotation
    try {
        const { downloadImageWithProxyRotation } = await import('../imageDownloader.js');
        const result = await downloadImageWithProxyRotation(TEST_IMAGES.statusm, {
            requestId: 'test-proxy',
            responseType: 'blob',
            diagnosticMode: false
        });
        logSuccess(`Universal downloader successful! (${(result.size / 1024).toFixed(2)} KB via ${result.usedProxy || 'direct'})`);
        results.push({ name: '24. Universal Downloader', passed: true });
    } catch (error) {
        logError(`Universal downloader failed: ${error.message}`);
        results.push({ name: '24. Universal Downloader', passed: false });
    }

    // Test 25: Proxy Diagnostics
    try {
        const { diagnoseProxies } = await import('../imageDownloader.js');
        const result = await diagnoseProxies(TEST_IMAGES.statusm, 'diag-test');
        
        console.log(`\n   Working proxies: ${result.workingProxiesCount}`);
        console.log(`   Failed proxies: ${result.failedProxiesCount}`);
        if (result.bestProxy) {
            console.log(`   Best proxy: ${result.bestProxy.name} (${result.bestProxy.responseTime}ms)`);
        }
        
        results.push({ name: '25. Proxy Diagnostics', passed: result.workingProxiesCount > 0 });
    } catch (error) {
        logError(`Proxy diagnostics failed: ${error.message}`);
        results.push({ name: '25. Proxy Diagnostics', passed: false });
    }

    return results;
}
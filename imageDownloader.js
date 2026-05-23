// imageDownloader.js - Universal download utilities for Status.me images
// Can be used in: Cloudflare Worker, Node.js, Browser

// imageDownloader.js - Enhanced with proxy diagnostics
import axios from 'axios'; 
/**
 * Test a single proxy and return detailed results
 * @param {string} proxyUrl - The proxy URL to test
 * @param {string} imageUrl - Original image URL
 * @param {Object} headers - Request headers
 * @param {AbortSignal} signal - Abort signal
 * @param {string} requestId - Request ID for logging
 * @returns {Promise<{working: boolean, statusCode?: number, responseTime?: number, error?: string, proxyUrl: string}>}
 */
async function testProxy(proxyUrl, imageUrl, headers, signal, requestId) {
    const startTime = Date.now();
    try {
        console.log(`[${requestId}] [PROXY TEST] Testing: ${proxyUrl.substring(0, 60)}...`);

        const testResponse = await fetch(proxyUrl, {
            headers,
            signal,
            method: 'HEAD' // Use HEAD to check without downloading full image
        });

        const responseTime = Date.now() - startTime;

        if (testResponse.ok) {
            console.log(`[${requestId}] [PROXY TEST] ✅ WORKING - Status: ${testResponse.status} in ${responseTime}ms`);
            return {
                working: true,
                statusCode: testResponse.status,
                responseTime,
                proxyUrl
            };
        } else {
            console.log(`[${requestId}] [PROXY TEST] ❌ FAILED - Status: ${testResponse.status} in ${responseTime}ms`);
            return {
                working: false,
                statusCode: testResponse.status,
                responseTime,
                error: `HTTP ${testResponse.status}`,
                proxyUrl
            };
        }
    } catch (error) {
        const responseTime = Date.now() - startTime;
        console.log(`[${requestId}] [PROXY TEST] ❌ FAILED - Error: ${error.message} in ${responseTime}ms`);
        return {
            working: false,
            error: error.message,
            responseTime,
            proxyUrl
        };
    }
}

/**
 * Universal image downloader with proxy rotation and detailed diagnostics
 * Works in: Cloudflare Workers, Node.js, Browser
 * 
 * @param {string} imageUrl - URL of the image to download
 * @param {Object} options - Configuration options
 * @param {string} options.requestId - Request ID for logging
 * @param {AbortSignal} options.signal - Abort signal for cancellation
 * @param {number} options.timeout - Timeout in milliseconds (default: 30000)
 * @param {boolean} options.diagnosticMode - If true, test all proxies without downloading (default: false)
 * @returns {Promise<{data: Blob|ArrayBuffer, contentType: string, size: number, downloadTime: number, fetchUrl: string, proxyDiagnostics?: Array}>}
 */
async function downloadImageWithProxyRotation(imageUrl, options = {}) {
    const {
        requestId = 'download',
        signal,
        timeout = 30000,
        responseType = 'blob',
        diagnosticMode = false
    } = options;

    console.log(`\n${'='.repeat(60)}`);
    console.log(`[${requestId}] [DOWNLOAD] Starting: ${imageUrl.substring(0, 80)}...`);
    console.log(`[${requestId}] [DOWNLOAD] Diagnostic Mode: ${diagnosticMode}`);
    console.log(`${'='.repeat(60)}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    if (signal) {
        signal.addEventListener('abort', () => controller.abort());
    }

    // Store diagnostic results
    const proxyDiagnostics = [];

    try {
        let fetchUrl = imageUrl;
        let usedProxy = null;
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': 'https://statusm.me/',
        };

        // ============================================
        // DIAGNOSTIC SECTION - Test all proxies first
        // ============================================
        if (imageUrl.includes('statusm.me')) {
            console.log(`\n[${requestId}] [DIAGNOSTIC] Testing all available proxies for statusm.me...\n`);

            const proxies = [
                { name: 'Direct Fetch (No Proxy)', url: imageUrl, type: 'direct' },
                { name: 'corsproxy.io', url: `https://corsproxy.io/?url=${encodeURIComponent(imageUrl)}`, type: 'proxy' },
                { name: 'api.allorigins.win', url: `https://api.allorigins.win/raw?url=${encodeURIComponent(imageUrl)}`, type: 'proxy' },
                { name: 'cors-anywhere.herokuapp.com', url: `https://cors-anywhere.herokuapp.com/${imageUrl}`, type: 'proxy' },
            ];

            // Test each proxy
            for (const proxy of proxies) {
                console.log(`\n[${requestId}] ┌─────────────────────────────────────────────────────────`);
                console.log(`[${requestId}] │ Testing: ${proxy.name}`);
                console.log(`[${requestId}] │ URL: ${proxy.url.substring(0, 70)}...`);

                const result = await testProxy(proxy.url, imageUrl, headers, controller.signal, requestId);

                proxyDiagnostics.push({
                    name: proxy.name,
                    url: proxy.url,
                    type: proxy.type,
                    working: result.working,
                    statusCode: result.statusCode,
                    responseTime: result.responseTime,
                    error: result.error
                });

                // Display result with clear indicator
                const statusIcon = result.working ? '✅' : '❌';
                const statusText = result.working ? 'WORKING' : 'FAILED';
                const color = result.working ? '\x1b[32m' : '\x1b[31m';
                console.log(`[${requestId}] └─ ${color}${statusIcon} ${statusText}${'\x1b[0m'} - ${result.responseTime}ms${result.error ? ` (${result.error})` : ''}`);
            }

            console.log(`\n[${requestId}] [DIAGNOSTIC] Summary of proxy tests:`);
            console.log(`[${requestId}] ${'─'.repeat(50)}`);

            const workingProxies = proxyDiagnostics.filter(p => p.working);
            const failedProxies = proxyDiagnostics.filter(p => !p.working);

            console.log(`[${requestId}] ✅ Working proxies: ${workingProxies.length}`);
            workingProxies.forEach(p => {
                console.log(`[${requestId}]    - ${p.name} (${p.responseTime}ms)`);
            });

            console.log(`[${requestId}] ❌ Failed proxies: ${failedProxies.length}`);
            failedProxies.forEach(p => {
                console.log(`[${requestId}]    - ${p.name}: ${p.error || `HTTP ${p.statusCode}`}`);
            });

            // If diagnostic mode only, return results without downloading
            if (diagnosticMode) {
                clearTimeout(timeoutId);
                console.log(`\n[${requestId}] [DIAGNOSTIC] Mode enabled - stopping before download`);
                console.log(`${'='.repeat(60)}\n`);
                return {
                    diagnosticMode: true,
                    proxyDiagnostics,
                    workingProxiesCount: workingProxies.length,
                    failedProxiesCount: failedProxies.length,
                    bestProxy: workingProxies.length > 0 ? workingProxies[0] : null
                };
            }

            // Select the best working proxy (fastest response time)
            if (workingProxies.length > 0) {
                // Sort by response time (fastest first)
                workingProxies.sort((a, b) => a.responseTime - b.responseTime);
                const bestProxy = workingProxies[0];
                fetchUrl = bestProxy.url;
                usedProxy = bestProxy.name;
                console.log(`\n[${requestId}] [PROXY SELECTION] Selected: ${bestProxy.name} (${bestProxy.responseTime}ms)`);
            } else {
                console.log(`\n[${requestId}] [PROXY SELECTION] ⚠️ No working proxies found! Will try direct fetch.`);
            }
        }

        // ============================================
        // For Supabase images, direct fetch works fine
        // ============================================
        if (imageUrl.includes('supabase.co')) {
            console.log(`[${requestId}] [DOWNLOAD] Direct fetch for Supabase image (no proxy needed)`);
            fetchUrl = imageUrl;
            usedProxy = 'direct (supabase)';
        }

        // ============================================
        // Actual download
        // ============================================
        console.log(`\n[${requestId}] [DOWNLOAD] Attempting download via: ${usedProxy || (fetchUrl === imageUrl ? 'direct' : 'proxy')}`);
        console.log(`[${requestId}] [DOWNLOAD] URL: ${fetchUrl.substring(0, 80)}...`);

        const downloadStart = Date.now();
        const response = await fetch(fetchUrl, { headers, signal: controller.signal });
        const downloadTime = Date.now() - downloadStart;

        clearTimeout(timeoutId);

        if (!response.ok) {
            console.log(`[${requestId}] [DOWNLOAD] ❌ Failed: HTTP ${response.status} in ${downloadTime}ms`);
            throw new Error(`HTTP ${response.status}`);
        }

        const contentType = response.headers.get('content-type');
        const contentLength = response.headers.get('content-length');

        console.log(`[${requestId}] [DOWNLOAD] ✅ Response received:`);
        console.log(`[${requestId}]    Status: ${response.status}`);
        console.log(`[${requestId}]    Content-Type: ${contentType}`);
        console.log(`[${requestId}]    Size: ${contentLength ? (parseInt(contentLength) / 1024).toFixed(2) + ' KB' : 'unknown'}`);
        console.log(`[${requestId}]    Download Time: ${downloadTime}ms`);

        let data;
        if (responseType === 'arraybuffer') {
            data = await response.arrayBuffer();
        } else {
            data = await response.blob();
        }

        const actualSize = data.byteLength || data.size;
        console.log(`[${requestId}] [DOWNLOAD] ✅ Success! Downloaded ${(actualSize / 1024).toFixed(2)} KB in ${downloadTime}ms`);
        console.log(`${'='.repeat(60)}\n`);

        return {
            data,
            contentType: contentType || 'image/jpeg',
            size: actualSize,
            downloadTime,
            fetchUrl,
            usedProxy,
            proxyDiagnostics: proxyDiagnostics.length > 0 ? proxyDiagnostics : undefined
        };
    } catch (error) {
        clearTimeout(timeoutId);
        console.log(`[${requestId}] [DOWNLOAD] ❌ ERROR: ${error.message}`);
        console.log(`${'='.repeat(60)}\n`);
        throw error;
    }
}

/**
 * Run diagnostic test only (no download)
 * @param {string} imageUrl - URL of the image to test
 * @returns {Promise<Object>} Diagnostic results
 */
async function diagnoseProxies(imageUrl, requestId = 'diagnostic') {
    return downloadImageWithProxyRotation(imageUrl, {
        requestId,
        diagnosticMode: true,
        timeout: 10000
    });
}

/**
 * Download via local Node.js proxy server
 * @param {string} imageUrl - URL of the image
 * @param {string} proxyUrl - Local proxy server URL (default: http://localhost:8080)
 * @returns {Promise<{success: boolean, data?: any, contentType?: string, size?: number, error?: string}>}
 */
async function downloadViaLocalProxy(imageUrl, proxyUrl = 'http://localhost:8080') {
    try {
        const response = await axios.get(`${proxyUrl}/proxy`, {
            params: { url: imageUrl },
            responseType: 'arraybuffer',
            timeout: 15000,
        });

        return {
            success: true,
            data: response.data,
            contentType: response.headers['content-type'],
            size: response.data.byteLength,
            status: response.status,
        };
    } catch (error) {
        return {
            success: false,
            error: error.message,
            status: error.response?.status || 0,
        };
    }
}

/**
 * Check if local proxy server is running
 * @param {string} proxyUrl - Local proxy server URL
 * @returns {Promise<boolean>}
 */
async function isLocalProxyRunning(proxyUrl = 'http://localhost:8080') {
    try {
        await axios.get(`${proxyUrl}/health`, { timeout: 2000 });
        return true;
    } catch {
        return false;
    }
}

/**
 * Download via Cloudflare Worker proxy
 * @param {string} imageUrl - URL of the image
 * @param {string} cfProxyUrl - Cloudflare Worker proxy URL
 * @returns {Promise<{success: boolean, data?: any, contentType?: string, size?: number, error?: string}>}
 */
async function downloadViaCloudflareProxy(imageUrl, cfProxyUrl) {
    try {
        const response = await axios.get(`${cfProxyUrl}/proxy`, {
            params: { url: imageUrl },
            responseType: 'arraybuffer',
            timeout: 15000,
        });

        return {
            success: true,
            data: response.data,
            contentType: response.headers['content-type'],
            size: response.data.byteLength,
            status: response.status,
        };
    } catch (error) {
        return {
            success: false,
            error: error.message,
            status: error.response?.status || 0,
        };
    }
}

/**
 * Direct fetch from Status.me with proper headers
 * @param {string} imageUrl - URL of the image
 * @param {Object} options - Configuration options
 * @returns {Promise<{success: boolean, data?: any, contentType?: string, size?: number, status?: number, error?: string}>}
 */
async function directFetchStatusMe(imageUrl, options = {}) {
    const { timeout = 15000, responseType = 'arraybuffer' } = options;

    try {
        // For Node.js environment, use axios
        const response = await axios.get(imageUrl, {
            responseType: responseType === 'arraybuffer' ? 'arraybuffer' : 'json',
            timeout,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': 'https://statusm.me/',
                'Origin': 'https://statusm.me',
            },
            validateStatus: (status) => status < 500
        });

        return {
            success: response.status === 200,
            data: response.data,
            contentType: response.headers['content-type'],
            size: response.data?.byteLength || response.data?.length,
            status: response.status,
        };
    } catch (error) {
        return {
            success: false,
            error: error.message,
            status: error.response?.status || 0,
        };
    }
}

/**
 * Get image as Base64 (useful for embedding)
 * @param {string} imageUrl - URL of the image
 * @returns {Promise<string>} Base64 encoded image
 */
async function getImageAsBase64(imageUrl) {
    const result = await downloadImageWithProxyRotation(imageUrl, { responseType: 'blob' });
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(result.data);
    });
}

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        downloadImageWithProxyRotation,
        directFetchStatusMe,
        downloadViaLocalProxy,
        downloadViaCloudflareProxy,
        isLocalProxyRunning,
        getImageAsBase64,
        diagnoseProxies,
        testProxy,
    };
}

export {
    downloadImageWithProxyRotation,
    directFetchStatusMe,
    downloadViaLocalProxy,
    downloadViaCloudflareProxy,
    isLocalProxyRunning,
    getImageAsBase64,
    diagnoseProxies,
    testProxy,
};
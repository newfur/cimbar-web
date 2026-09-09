const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = 8080;
const WEB_DIR = path.join(__dirname, 'web');

// Get local IPv4 address
function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const interfaceName in interfaces) {
    const addresses = interfaces[interfaceName];
    for (const addr of addresses) {
      if (addr.family === 'IPv4' && !addr.internal) {
        return addr.address;
      }
    }
  }
  return '127.0.0.1';
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.wasm': 'application/wasm',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml'
};

const zlib = require('zlib');

const COMPRESSIBLE_EXTS = new Set(['.html', '.css', '.js', '.wasm', '.json', '.svg']);

const server = http.createServer((req, res) => {
  const localIp = getLocalIpAddress();

  // API Endpoint to get server connection details
  if (req.url === '/api/info' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      ip: localIp,
      port: PORT,
      url: `http://${localIp}:${PORT}`
    }));
    return;
  }

  // Sanitize path to prevent directory traversal
  let safeUrl = req.url.split('?')[0];
  if (safeUrl === '/' || safeUrl === '') {
    safeUrl = '/index.html';
  }

  const filePath = path.join(WEB_DIR, safeUrl);

  // Check if file is inside the web directory boundary
  if (!filePath.startsWith(WEB_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const etag = `W/"${stats.size.toString(16)}-${Math.floor(stats.mtimeMs).toString(16)}"`;

    // Check If-None-Match for 304 Not Modified
    if (req.headers['if-none-match'] === etag) {
      res.writeHead(304, {
        'ETag': etag,
        'Cache-Control': ext.includes('2026-') ? 'public, max-age=31536000, immutable' : 'no-cache'
      });
      res.end();
      return;
    }

    // Set smart caching policy:
    // Versioned assets (e.g. *.2026-08-21T2336.*) and images are immutable
    const isImmutable = /20\d\d-\d\d-\d\dT\d\d\d\d/.test(safeUrl) || ['.png', '.ico', '.jpg'].includes(ext);
    const cacheControl = isImmutable
      ? 'public, max-age=31536000, immutable'
      : 'no-cache';

    const headers = {
      'Content-Type': contentType,
      'Cache-Control': cacheControl,
      'ETag': etag,
      'Vary': 'Accept-Encoding',
      'Access-Control-Allow-Origin': '*'
    };

    // Determine HTTP compression (Brotli / Gzip / Deflate)
    const acceptEncoding = req.headers['accept-encoding'] || '';
    const shouldCompress = COMPRESSIBLE_EXTS.has(ext);

    let stream = fs.createReadStream(filePath);
    let transform = null;

    if (shouldCompress) {
      if (acceptEncoding.includes('br') && zlib.createBrotliCompress) {
        headers['Content-Encoding'] = 'br';
        transform = zlib.createBrotliCompress({
          params: {
            [zlib.constants.BROTLI_PARAM_QUALITY]: 4 // Fast quality for dynamic serving
          }
        });
      } else if (acceptEncoding.includes('gzip')) {
        headers['Content-Encoding'] = 'gzip';
        transform = zlib.createGzip({ level: 6 });
      } else if (acceptEncoding.includes('deflate')) {
        headers['Content-Encoding'] = 'deflate';
        transform = zlib.createDeflate();
      }
    }

    res.writeHead(200, headers);

    stream.on('error', (streamErr) => {
      console.error('Stream error:', streamErr);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('500 Internal Server Error');
      }
    });

    if (transform) {
      stream.pipe(transform).pipe(res);
    } else {
      stream.pipe(res);
    }
  });
});

server.listen(PORT, () => {
  const localIp = getLocalIpAddress();
  console.log(`==================================================`);
  console.log(`  CIMBAR Web Portal Server running!`);
  console.log(`  Local:   http://localhost:${PORT}`);
  console.log(`  Network: http://${localIp}:${PORT}`);
  console.log(`==================================================`);
});

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;
const STATIC_DIR = path.join(__dirname, 'weather-app');

function getContentType(ext) {
  const types = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.svg': 'image/svg+xml'
  };
  return types[ext] || 'application/octet-stream';
}

function serveStatic(res, filePath) {
  try {
    const data = fs.readFileSync(filePath);
    const ext = path.extname(filePath);
    res.writeHead(200, {
      'Content-Type': getContentType(ext),
      'Access-Control-Allow-Origin': '*'
    });
    res.end(data);
  } catch (e) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
}

function proxyRequest(res, apiUrl, extraHeaders) {
  const options = new URL(apiUrl);
  const headers = Object.assign({
    'User-Agent': 'weather-app/1.0 (localhost)'
  }, extraHeaders || {});

  https.get(options, { headers }, (apiRes) => {
    let body = '';
    apiRes.on('data', chunk => body += chunk);
    apiRes.on('end', () => {
      const respHeaders = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      };
      // Forward CORS headers from the API
      if (apiRes.headers['access-control-allow-origin']) {
        respHeaders['Access-Control-Allow-Origin'] = apiRes.headers['access-control-allow-origin'];
      }
      res.writeHead(apiRes.statusCode, respHeaders);
      res.end(body);
    });
  }).on('error', (err) => {
    console.error('Proxy error:', err.message);
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Weather API unavailable' }));
  });
}

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = parsedUrl.pathname;

  // CORS headers for all responses
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Weather API proxy
  if (pathname === '/api/weather') {
    const query = parsedUrl.search;
    console.log('Proxying weather request:', query.substring(0, 100));
    return proxyRequest(res, `https://api.open-meteo.com/v1/forecast${query}`);
  }

  // Geocoding API proxy
  if (pathname === '/api/geocode') {
    const query = parsedUrl.search;
    console.log('Proxying geocode request:', query.substring(0, 100));
    return proxyRequest(res, `https://nominatim.openstreetmap.org/v1/search${query}`);
  }

  // Serve static files
  let filePath = pathname === '/' ? '/index.html' : pathname;
  filePath = path.join(STATIC_DIR, filePath.replace(/^\//, ''));

  serveStatic(res, filePath);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Weather app running at http://127.0.0.1:${PORT}`);
});

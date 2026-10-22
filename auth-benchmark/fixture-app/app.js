const http = require('http');
const { URL } = require('url');

const port = Number(process.env.PORT || 3000);
const benchmarkName = process.env.BENCHMARK_NAME || 'auth-bench-fixture';
const MAX_UPLOAD_BYTES = 1024 * 1024;
// Credential-bearing headers are never echoed back to the caller.
const REDACTED_HEADERS = new Set([
  'authorization',
  'proxy-authorization',
  'cookie',
  'set-cookie',
  'x-forwarded-access-token',
  'x-auth-request-access-token',
  'x-auth-request-id-token',
]);

function json(response, statusCode, payload, headers = {}) {
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    ...headers,
  });
  response.end(JSON.stringify(payload, null, 2));
}

function collectBody(request) {
  return new Promise((resolve, reject) => {
    let received = 0;
    request.on('data', chunk => {
      received += chunk.length;
      if (received > MAX_UPLOAD_BYTES) {
        const error = new Error('payload too large');
        error.statusCode = 413;
        request.destroy();
        reject(error);
      }
    });
    request.on('end', () => resolve(received));
    request.on('error', reject);
    request.on('aborted', () => reject(new Error('request aborted')));
  });
}

function redactHeaders(headers) {
  return Object.fromEntries(
    Object.entries(headers).map(([name, value]) => [
      name,
      REDACTED_HEADERS.has(name.toLowerCase()) ? '[redacted]' : value,
    ]),
  );
}

function cookieNames(header) {
  return (header || '')
    .split(';')
    .map(part => part.split('=')[0].trim())
    .filter(Boolean);
}

// Only same-origin absolute paths are allowed as redirect targets.
function safeRedirectTarget(candidate) {
  if (!candidate.startsWith('/') || candidate.startsWith('//') || candidate.includes('\\')) {
    return '/';
  }
  return candidate;
}

function requestSummary(request, requestUrl) {
  return {
    benchmarkName,
    method: request.method,
    path: requestUrl.pathname,
    query: Object.fromEntries(requestUrl.searchParams.entries()),
    host: request.headers.host || null,
    forwardedHost: request.headers['x-forwarded-host'] || null,
    forwardedProto: request.headers['x-forwarded-proto'] || null,
    forwardedFor: request.headers['x-forwarded-for'] || null,
    forwardedUser: request.headers['x-forwarded-user'] || null,
    forwardedEmail: request.headers['x-forwarded-email'] || null,
    authorization: request.headers.authorization ? 'present' : 'absent',
    cookieNames: cookieNames(request.headers.cookie),
    headers: redactHeaders(request.headers),
    now: new Date().toISOString(),
  };
}

const server = http.createServer(async (request, response) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host || 'localhost'}`);

  if (requestUrl.pathname === '/') {
    return json(response, 200, {
      benchmarkName,
      message: 'auth benchmark fixture ready',
      availableEndpoints: [
        '/',
        '/api/ping',
        '/headers',
        '/redirect?to=/api/ping?probe=1',
        '/download',
        '/upload',
        '/events',
        '/set-cookie',
      ],
      request: requestSummary(request, requestUrl),
    });
  }

  if (requestUrl.pathname === '/api/ping') {
    return json(response, 200, {
      ok: true,
      probe: requestUrl.searchParams.get('probe') || null,
      request: requestSummary(request, requestUrl),
    });
  }

  if (requestUrl.pathname === '/headers') {
    return json(response, 200, requestSummary(request, requestUrl));
  }

  if (requestUrl.pathname === '/redirect') {
    const destination = safeRedirectTarget(requestUrl.searchParams.get('to') || '/');
    response.writeHead(302, { location: destination });
    response.end();
    return;
  }

  if (requestUrl.pathname === '/download') {
    const body = Buffer.from('auth-benchmark-download\n', 'utf8');
    response.writeHead(200, {
      'content-type': 'text/plain; charset=utf-8',
      'content-disposition': 'attachment; filename="auth-benchmark.txt"',
      'content-length': String(body.length),
      'cache-control': 'no-store',
    });
    response.end(body);
    return;
  }

  if (requestUrl.pathname === '/upload' && request.method === 'POST') {
    let bytesReceived;
    try {
      bytesReceived = await collectBody(request);
    } catch (error) {
      if (!response.headersSent && !response.writableEnded && !response.destroyed) {
        json(response, error.statusCode || 400, { error: error.message }, { connection: 'close' });
      }
      return;
    }
    return json(response, 200, {
      ok: true,
      bytesReceived,
      contentType: request.headers['content-type'] || null,
      request: requestSummary(request, requestUrl),
    });
  }

  if (requestUrl.pathname === '/set-cookie') {
    response.writeHead(200, {
      'content-type': 'application/json; charset=utf-8',
      'set-cookie': 'fixture-session=1; Path=/; HttpOnly; SameSite=Lax',
      'cache-control': 'no-store',
    });
    response.end(JSON.stringify({ ok: true, cookie: 'fixture-session=1' }, null, 2));
    return;
  }

  if (requestUrl.pathname === '/events') {
    response.writeHead(200, {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-store, must-revalidate',
      connection: 'keep-alive',
    });
    response.write('event: hello\n');
    response.write(`data: ${JSON.stringify({ benchmarkName, t: Date.now() })}\n\n`);
    const timer = setInterval(() => {
      response.write(`data: ${JSON.stringify({ tick: Date.now() })}\n\n`);
    }, 1500);
    request.on('close', () => clearInterval(timer));
    return;
  }

  json(response, 404, {
    error: 'not found',
    request: requestSummary(request, requestUrl),
  });
});

if (require.main === module) {
  server.listen(port, '0.0.0.0', () => {
    console.log(`fixture listening on ${port}`);
  });
}

module.exports = { server, MAX_UPLOAD_BYTES };
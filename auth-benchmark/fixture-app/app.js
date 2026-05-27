const http = require('http');
const { URL } = require('url');

const port = Number(process.env.PORT || 3000);
const benchmarkName = process.env.BENCHMARK_NAME || 'auth-bench-fixture';

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
    const chunks = [];
    request.on('data', chunk => chunks.push(chunk));
    request.on('end', () => resolve(Buffer.concat(chunks)));
    request.on('error', reject);
  });
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
    cookies: request.headers.cookie || '',
    headers: request.headers,
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
    const destination = requestUrl.searchParams.get('to') || '/';
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
    const body = await collectBody(request);
    return json(response, 200, {
      ok: true,
      bytesReceived: body.length,
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

server.listen(port, '0.0.0.0', () => {
  console.log(`fixture listening on ${port}`);
});
// 這個檔案負責提供 MOI_test 的靜態 parquet 資料與健康檢查 API。
import {createServer} from 'node:http';
import {createReadStream} from 'node:fs';
import {stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const staticRoot = path.resolve(__dirname, 'static');
const port = Number(process.env.PORT || 7780);

const mimeTypes = {
  '.json': 'application/json; charset=utf-8',
  '.geojson': 'application/geo+json; charset=utf-8',
  '.parquet': 'application/vnd.apache.parquet',
  '.txt': 'text/plain; charset=utf-8',
};

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Range');
  res.setHeader('Access-Control-Expose-Headers', 'Accept-Ranges,Content-Length,Content-Range,Content-Type');
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function resolveStaticPath(requestPath) {
  const decoded = decodeURIComponent(requestPath);
  const candidate = path.resolve(staticRoot, decoded);

  if (!candidate.startsWith(staticRoot)) {
    return null;
  }

  return candidate;
}

function parseRangeHeader(rangeHeader, fileSize) {
  if (!rangeHeader?.startsWith('bytes=')) {
    return null;
  }

  const [rawStart, rawEnd] = rangeHeader.replace('bytes=', '').split('-', 2);
  const start = rawStart === '' ? 0 : Number(rawStart);
  const end = rawEnd === '' ? fileSize - 1 : Number(rawEnd);

  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start || end >= fileSize) {
    return {invalid: true};
  }

  return {start, end};
}

const server = createServer(async (req, res) => {
  setCorsHeaders(res);

  if (!req.url) {
    sendJson(res, 400, {error: 'Missing request URL'});
    return;
  }

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (!['GET', 'HEAD'].includes(req.method || '')) {
    sendJson(res, 405, {error: 'Method not allowed'});
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (url.pathname === '/health') {
    sendJson(res, 200, {ok: true, staticRoot});
    return;
  }

  if (!url.pathname.startsWith('/data/')) {
    sendJson(res, 404, {error: 'Not found'});
    return;
  }

  const relativePath = url.pathname.slice('/data/'.length);
  const filePath = resolveStaticPath(relativePath);

  if (!filePath) {
    sendJson(res, 403, {error: 'Forbidden'});
    return;
  }

  let fileInfo;

  try {
    fileInfo = await stat(filePath);
  } catch {
    sendJson(res, 404, {error: 'File not found'});
    return;
  }

  if (!fileInfo.isFile()) {
    sendJson(res, 404, {error: 'Path is not a file'});
    return;
  }

  const contentType = mimeTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
  const range = parseRangeHeader(req.headers.range, fileInfo.size);

  if (range?.invalid) {
    res.writeHead(416, {
      'Content-Range': `bytes */${fileInfo.size}`,
    });
    res.end();
    return;
  }

  const start = range?.start ?? 0;
  const end = range?.end ?? fileInfo.size - 1;
  const contentLength = end - start + 1;

  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Content-Type', contentType);
  res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
  res.setHeader('Content-Length', String(contentLength));

  if (range) {
    res.statusCode = 206;
    res.setHeader('Content-Range', `bytes ${start}-${end}/${fileInfo.size}`);
  } else {
    res.statusCode = 200;
  }

  if (req.method === 'HEAD') {
    res.end();
    return;
  }

  const stream = createReadStream(filePath, {start, end});
  stream.on('error', () => {
    if (!res.headersSent) {
      sendJson(res, 500, {error: 'Failed to read file'});
      return;
    }

    res.destroy();
  });
  stream.pipe(res);
});

server.listen(port, '0.0.0.0', () => {
  console.log(`MOI_test static backend listening on http://0.0.0.0:${port}`);
});

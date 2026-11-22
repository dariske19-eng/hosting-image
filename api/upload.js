import { put } from '@vercel/blob';
import { v4 as uuidv4 } from 'uuid';

export const config = {
  api: {
    bodyParser: false, // We need raw body for multipart
  },
};

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/bmp',
];

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

function getApiKey(req) {
  return (
    req.headers['x-api-key'] ||
    (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim()
  );
}

function isValidApiKey(key) {
  const validKeys = (process.env.API_KEYS || process.env.API_KEY || '')
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);

  // If no keys configured, allow a demo key for testing
  if (validKeys.length === 0) {
    return key === 'demo-key-change-me';
  }
  return validKeys.includes(key);
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, X-API-Key, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // Check API Key
  const apiKey = getApiKey(req);
  if (!apiKey || !isValidApiKey(apiKey)) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or missing API Key. Set header X-API-Key',
    });
  }

  // Check Blob token
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(500).json({
      success: false,
      error:
        'BLOB_READ_WRITE_TOKEN not configured. Create a Blob store in Vercel dashboard and add the token to Environment Variables.',
    });
  }

  try {
    // Parse multipart manually (simple & reliable)
    const contentType = req.headers['content-type'] || '';
    if (!contentType.includes('multipart/form-data')) {
      return res.status(400).json({
        success: false,
        error: 'Content-Type must be multipart/form-data',
      });
    }

    const boundary = contentType.split('boundary=')[1];
    if (!boundary) {
      return res.status(400).json({ success: false, error: 'No boundary found' });
    }

    // Collect raw body
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    if (buffer.length > MAX_SIZE + 1024 * 100) {
      return res.status(400).json({
        success: false,
        error: `File too large. Max ${MAX_SIZE / 1024 / 1024}MB`,
      });
    }

    // Very simple multipart parser for single file field named "file" or "image"
    const boundaryBuf = Buffer.from(`--${boundary}`);
    const parts = [];
    let start = buffer.indexOf(boundaryBuf) + boundaryBuf.length;

    while (start < buffer.length) {
      const end = buffer.indexOf(boundaryBuf, start);
      if (end === -1) break;
      parts.push(buffer.slice(start, end));
      start = end + boundaryBuf.length;
    }

    let fileBuffer = null;
    let filename = 'image';
    let mimeType = 'application/octet-stream';

    for (const part of parts) {
      const headerEnd = part.indexOf('\r\n\r\n');
      if (headerEnd === -1) continue;
      const headers = part.slice(0, headerEnd).toString();
      const body = part.slice(headerEnd + 4, part.length - 2); // remove trailing \r\n

      if (
        headers.includes('name="file"') ||
        headers.includes('name="image"')
      ) {
        const filenameMatch = headers.match(/filename="([^"]+)"/i);
        if (filenameMatch) filename = filenameMatch[1];

        const typeMatch = headers.match(/Content-Type:\s*([^\r\n]+)/i);
        if (typeMatch) mimeType = typeMatch[1].trim();

        fileBuffer = body;
        break;
      }
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No file found. Use field name "file" or "image"',
      });
    }

    if (fileBuffer.length > MAX_SIZE) {
      return res.status(400).json({
        success: false,
        error: `File too large. Max ${MAX_SIZE / 1024 / 1024}MB`,
      });
    }

    // Detect mime from magic bytes if needed
    if (!ALLOWED_TYPES.includes(mimeType)) {
      if (fileBuffer[0] === 0xff && fileBuffer[1] === 0xd8) mimeType = 'image/jpeg';
      else if (
        fileBuffer[0] === 0x89 &&
        fileBuffer[1] === 0x50 &&
        fileBuffer[2] === 0x4e &&
        fileBuffer[3] === 0x47
      )
        mimeType = 'image/png';
      else if (
        fileBuffer[0] === 0x47 &&
        fileBuffer[1] === 0x49 &&
        fileBuffer[2] === 0x46
      )
        mimeType = 'image/gif';
      else if (
        fileBuffer.toString('ascii', 0, 4) === 'RIFF' &&
        fileBuffer.toString('ascii', 8, 12) === 'WEBP'
      )
        mimeType = 'image/webp';
    }

    if (!ALLOWED_TYPES.includes(mimeType)) {
      return res.status(400).json({
        success: false,
        error: `Unsupported type: ${mimeType}. Allowed: jpeg, png, gif, webp, svg, bmp`,
      });
    }

    const extMap = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'image/svg+xml': 'svg',
      'image/bmp': 'bmp',
    };
    const ext = extMap[mimeType] || 'bin';
    const id = uuidv4();
    const pathname = `images/${id}.${ext}`;

    // Upload to Vercel Blob
    const blob = await put(pathname, fileBuffer, {
      access: 'public',
      contentType: mimeType,
      addRandomSuffix: false,
    });

    return res.status(200).json({
      success: true,
      id,
      url: blob.url,
      downloadUrl: blob.downloadUrl || blob.url,
      pathname: blob.pathname,
      size: fileBuffer.length,
      contentType: mimeType,
      filename,
    });
  } catch (err) {
    console.error('Upload error:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Internal server error',
    });
  }
}

import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import fs from 'fs';
import path from 'path';
import cors from 'cors';
import multer from 'multer';
import axios from 'axios';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import * as Minio from 'minio';

// Recreate __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize MinIO client
let minioClient = null;
if (process.env.MINIO_ENDPOINT) {
  minioClient = new Minio.Client({
    endPoint: process.env.MINIO_ENDPOINT,
    port: parseInt(process.env.MINIO_PORT || '443', 10),
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY || '',
    secretKey: process.env.MINIO_SECRET_KEY || '',
    region: process.env.MINIO_REGION || 'abas-ph'
  });
  console.log('[MinIO] Client initialized for:', process.env.MINIO_ENDPOINT);
} else {
  console.log('[MinIO] Client NOT initialized (MINIO_ENDPOINT missing)');
}

async function uploadBase64ToMinio(base64Str, filename) {
  if (!minioClient || !base64Str) return base64Str;
  try {
    const matches = base64Str.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return base64Str;
    }
    const contentType = matches[1];
    const buffer = Buffer.from(matches[2], 'base64');
    const bucketName = process.env.MINIO_BUCKET || 'company-id';
    const year = new Date().getFullYear();
    const objectName = `ids/${year}/${filename}`;
    
    const exists = await minioClient.bucketExists(bucketName).catch(() => false);
    if (!exists) {
      await minioClient.makeBucket(bucketName, process.env.MINIO_REGION || 'abas-ph');
      console.log(`[MinIO] Created bucket: ${bucketName}`);
    }

    try {
      const policy = JSON.stringify({
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${bucketName}/*`]
          }
        ]
      });
      await minioClient.setBucketPolicy(bucketName, policy);
    } catch (policyErr) {
      console.log('[MinIO] Note: Could not set bucket policy:', policyErr.message);
    }

    await minioClient.putObject(bucketName, objectName, buffer, buffer.length, {
      'Content-Type': contentType
    });
    
    const publicUrl = `${process.env.MINIO_PUBLIC_URL || `https://${process.env.MINIO_ENDPOINT}`}/${bucketName}/${objectName}`;
    console.log(`[MinIO] Uploaded ${objectName} successfully: ${publicUrl}`);
    return publicUrl;
  } catch (err) {
    console.error('[MinIO] Upload failed:', err.message);
    return base64Str;
  }
}

async function uploadBufferToMinio(buffer, objectName, contentType) {
  if (!minioClient) return null;
  const bucketName = process.env.MINIO_BUCKET || 'company-id';
  try {
    const exists = await minioClient.bucketExists(bucketName).catch(() => false);
    if (!exists) {
      await minioClient.makeBucket(bucketName, process.env.MINIO_REGION || 'abas-ph');
      console.log(`[MinIO] Created bucket: ${bucketName}`);
    }

    try {
      const policy = JSON.stringify({
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${bucketName}/*`]
          }
        ]
      });
      await minioClient.setBucketPolicy(bucketName, policy);
    } catch (policyErr) {
      console.log('[MinIO] Note: Could not set bucket policy:', policyErr.message);
    }

    await minioClient.putObject(bucketName, objectName, buffer, buffer.length, {
      'Content-Type': contentType
    });

    const publicUrl = `${process.env.MINIO_PUBLIC_URL || `https://${process.env.MINIO_ENDPOINT}`}/${bucketName}/${objectName}`;
    console.log(`[MinIO] Uploaded to abas/${objectName} successfully: ${publicUrl}`);
    return publicUrl;
  } catch (err) {
    console.error('[MinIO] Upload to bucket abas failed:', err.message);
    throw err;
  }
}

async function uploadBase64ToAbasMinio(base64Str, objectName, contentType) {
  if (!minioClient || !base64Str) return base64Str;
  try {
    const matches = base64Str.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return base64Str;
    }
    const actualContentType = contentType || matches[1];
    const buffer = Buffer.from(matches[2], 'base64');
    return await uploadBufferToMinio(buffer, objectName, actualContentType);
  } catch (err) {
    console.error('[MinIO] Base64 upload to abas failed:', err.message);
    return base64Str;
  }
}

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_PATH = path.join(__dirname, 'data');
const IMAGES_PATH = path.join(__dirname, 'data', 'images');
const DB_FILE = path.join(DATA_PATH, 'database.json');
const RECORDS_FILE = path.join(DATA_PATH, 'records.json');
const TEMPLATES_FILE = path.join(DATA_PATH, 'templates.json');
const USERS_FILE = path.join(DATA_PATH, 'users.json');

// ── Employee ID Hashing ──
// Set HASH_SECRET in your .env file. Keep this secret — changing it invalidates all existing QR codes.
const HASH_SECRET = process.env.HASH_SECRET || 'avpass-default-secret-change-me';

function hashEmpCode(empCode) {
  return crypto.createHmac('sha256', HASH_SECRET)
    .update(empCode.toLowerCase())
    .digest('hex');
}

// Cache: hash → employee_id, cleared every 10 minutes so status changes reflect quickly
const hashCache = new Map();
const HASH_CACHE_TTL = 10 * 60 * 1000;

function getCachedEmpCode(hash) {
  const entry = hashCache.get(hash);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > HASH_CACHE_TTL) { hashCache.delete(hash); return null; }
  return entry.empCode;
}
function setCachedEmpCode(hash, empCode) {
  hashCache.set(hash, { empCode, cachedAt: Date.now() });
}

// ── Full employee list cache (refreshed every 30 mins) ──
// Avoids paginating HRIS on every verify request — HRIS crashes on page > 0
let employeeListCache = [];
let employeeCacheBuiltAt = 0;
const EMPLOYEE_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

async function refreshEmployeeCache() {
  try {
    const all = [];
    let page = 0;
    while (true) {
      const url = new URL('https://api.avegabros.org/website/id-employees');
      url.searchParams.append('key', process.env.HRIS_API_KEY);
      url.searchParams.append('status', 'Active');
      url.searchParams.append('limit', '500');
      url.searchParams.append('page', String(page));
      url.searchParams.append('order', 'asc');
      url.searchParams.append('sort', 'id');
      try {
        const r = await axios.get(url.toString(), { timeout: 15000 });
        const list = Array.isArray(r.data) ? r.data : (r.data?.data ?? []);
        if (list.length === 0) break;
        all.push(...list);
        console.log(`[EMP-CACHE] page=${page} +${list.length} total=${all.length}`);
        if (list.length < 500) break;
        page++;
      } catch (pageErr) {
        console.log(`[EMP-CACHE] page=${page} failed: ${pageErr.message} — stopping`);
        break;
      }
    }
    if (all.length > 0) {
      employeeListCache = all;
      employeeCacheBuiltAt = Date.now();
      console.log(`[EMP-CACHE] built with ${all.length} employees`);
    }
  } catch (err) {
    console.error('[EMP-CACHE] refresh failed:', err.message);
  }
}

async function getEmployeeList() {
  if (employeeListCache.length === 0 || Date.now() - employeeCacheBuiltAt > EMPLOYEE_CACHE_TTL) {
    await refreshEmployeeCache();
  }
  return employeeListCache;
}

// Refresh cache on startup + every 30 minutes
setTimeout(refreshEmployeeCache, 3000); // 3s after boot
setInterval(refreshEmployeeCache, EMPLOYEE_CACHE_TTL);

[DATA_PATH, IMAGES_PATH].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

app.use(cors());
app.use(express.json({ limit: '50mb' })); 

// ── Smart Image Proxy ──
// Serves locally if cached, otherwise fetches from avegabros.net and caches
app.get('/images/:filename', async (req, res) => {
  const filename = req.params.filename;

  res.setHeader('Access-Control-Allow-Origin', '*');

  if (!filename || ['null', 'undefined', ''].includes(filename)) {
    return res.status(404).send('No image specified');
  }

  const localPath = path.join(IMAGES_PATH, filename);

  // 1. Serve locally if already cached
  if (fs.existsSync(localPath)) {
    const ext = path.extname(filename).toLowerCase();
    const mime = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp' };
    if (mime[ext]) res.setHeader('Content-Type', mime[ext]);
    return res.sendFile(localPath);
  }

  // 1.5. Try fetching from MinIO first
  if (minioClient) {
    const bucketName = process.env.MINIO_BUCKET || 'company-id';
    const possibleKeys = [
      `hr/avatar/${filename}`,
      `hr/employee_pictures/${filename}`,
      `users/signatures/${filename}`,
      `hr/signatures/${filename}`,
      `hr/signature/${filename}`,
      `signatures/${filename}`,
      `signature/${filename}`,
      `users/signature/${filename}`
    ];

    let foundInMinio = false;
    for (const objectKey of possibleKeys) {
      try {
        console.log(`[PROXY] Checking MinIO: ${bucketName}/${objectKey}`);
        const stream = await minioClient.getObject(bucketName, objectKey);
        const ext = path.extname(filename).toLowerCase();
        const mime = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp' };
        if (mime[ext]) res.setHeader('Content-Type', mime[ext]);

        const writer = fs.createWriteStream(localPath);
        stream.pipe(writer);
        await new Promise((resolve, reject) => {
          writer.on('finish', resolve);
          writer.on('error', reject);
        });
        console.log(`[PROXY] Cached from MinIO: ${filename} (via key ${objectKey})`);
        foundInMinio = true;
        break;
      } catch (minioErr) {
        console.log(`[PROXY] MinIO check failed for ${objectKey}: ${minioErr.message}`);
      }
    }
    if (foundInMinio) {
      return res.sendFile(localPath);
    }
  }

  // 2. Fetch from remote — try photos folder first, then signatures folder
  const BASES = [
    'https://api.avegabros.org/',
    'https://abas.avegabros.org/',
    'https://abas-staging.avegabros.net/'
  ];
  const remotePaths = [
    `signatures/${filename}`,
    `assets/uploads/hr/avatar/${filename}`,
    `assets/uploads/hr/employee_pictures/${filename}`,
    `assets/uploads/users/signatures/${filename}`,
    `assets/uploads/signatures/${filename}`,
    `assets/uploads/hr/avatar/${filename}.png`,
    `assets/uploads/hr/avatar/${filename}.jpg`,
    `assets/uploads/hr/avatar/${filename}.jpeg`,
    `assets/uploads/users/signatures/${filename}.png`,
  ];

  for (const base of BASES) {
    let baseSuccess = false;
    for (const remotePath of remotePaths) {
      const remoteUrl = base + remotePath;
      try {
        console.log(`[PROXY] Fetching: ${remoteUrl}`);
        const response = await axios({ url: remoteUrl, method: 'GET', responseType: 'stream', timeout: 8000 });

        // ── Skip if response is not an actual image (e.g. HTML 404 page) ──
        const contentType = response.headers['content-type'] || '';
        if (!contentType.startsWith('image/')) {
          console.log(`[PROXY] Skipping non-image response (${contentType}): ${remoteUrl}`);
          response.data.destroy(); // close the stream
          continue;
        }

        res.setHeader('Content-Type', contentType);
        const writer = fs.createWriteStream(localPath);
        response.data.pipe(writer);
        await new Promise((resolve) => {
          writer.on('finish', () => { console.log(`[PROXY] Cached: ${filename}`); res.sendFile(localPath); resolve(undefined); });
          writer.on('error', (err) => { console.error('[PROXY] Write error:', err); res.status(500).send('Storage error'); resolve(undefined); });
        });
        baseSuccess = true;
        break;
      } catch { continue; }
    }
    if (baseSuccess) return;
  }

  console.error(`[PROXY 404] Not found: ${filename}`);
  res.status(404).send('Image not found');
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, IMAGES_PATH),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    cb(null, `temp_${Date.now()}${ext}`);
  }
});
const upload = multer({ storage });

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Image Upload
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file received' });
  const employeeName = (req.body.employeeName || 'unknown')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove accents (ñ → n, é → e)
    .replace(/[^a-z0-9_\-]/g, '_')                   // replace special chars with underscore
    .replace(/_+/g, '_')                              // collapse multiple underscores
    .replace(/^_|_$/g, '');                           // trim leading/trailing underscores
  const fileType = req.body.fileType || 'photo';
  const ext = path.extname(req.file.originalname) || '.png';
  const newFilename = fileType === 'signature' ? `${employeeName}_sig${ext}` : `${employeeName}${ext}`;
  const newPath = path.join(IMAGES_PATH, newFilename);
  fs.renameSync(req.file.path, newPath);
  console.log(`[IMAGE SAVED] ${newFilename}`);
  res.json({ url: `/images/${newFilename}` });
});

app.post('/api/id-requests/upload', upload.fields([
  { name: 'picture', maxCount: 1 },
  { name: 'signature', maxCount: 1 },
  { name: 'supportingDoc', maxCount: 1 }
]), async (req, res) => {
  try {
    const employeeName = req.body.employeeName || 'unknown';
    const cleanedName = employeeName
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9_\-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');

    const urls = {
      pictureUrl: null,
      signatureUrl: null,
      supportingDocUrl: null
    };

    const files = req.files || {};

    if (files.picture && files.picture[0]) {
      const file = files.picture[0];
      const ext = path.extname(file.originalname).toLowerCase() || '.png';
      const objectName = `raw/${cleanedName}/picture${ext}`;
      const buffer = fs.readFileSync(file.path);
      const contentType = file.mimetype || 'image/png';
      urls.pictureUrl = await uploadBufferToMinio(buffer, objectName, contentType);
      fs.unlinkSync(file.path);
    }

    if (files.signature && files.signature[0]) {
      const file = files.signature[0];
      const ext = path.extname(file.originalname).toLowerCase() || '.png';
      const objectName = `raw/${cleanedName}/signature${ext}`;
      const buffer = fs.readFileSync(file.path);
      const contentType = file.mimetype || 'image/png';
      urls.signatureUrl = await uploadBufferToMinio(buffer, objectName, contentType);
      fs.unlinkSync(file.path);
    }

    if (files.supportingDoc && files.supportingDoc[0]) {
      const file = files.supportingDoc[0];
      const ext = path.extname(file.originalname).toLowerCase() || '.pdf';
      const objectName = `raw/${cleanedName}/employee-docs${ext}`;
      const buffer = fs.readFileSync(file.path);
      const contentType = file.mimetype || 'application/pdf';
      urls.supportingDocUrl = await uploadBufferToMinio(buffer, objectName, contentType);
      fs.unlinkSync(file.path);
    }

    res.json(urls);
  } catch (err) {
    console.error('[UPLOAD-REQUEST-DOCS] Error:', err);
    res.status(500).json({ error: 'Failed to upload files', details: err.message });
  }
});

function deleteImageFile(url) {
  if (!url || url.startsWith('data:')) return;
  const filePath = path.join(__dirname, url);
  if (fs.existsSync(filePath)) { fs.unlinkSync(filePath); console.log(`[IMAGE DELETED] ${url}`); }
}

// ==========================================
// NEW HRIS API INTEGRATION
// ==========================================

app.get('/api/employees', async (req, res) => {
  const attempt = async () => {
      const { search, page, limit, company } = req.query;
      
      const url = new URL('https://api.avegabros.org/website/id-employees');
      url.searchParams.append('key', process.env.HRIS_API_KEY);
      url.searchParams.append('status', 'Active');
      url.searchParams.append('order', 'asc');
      url.searchParams.append('sort', 'id');
      url.searchParams.append('limit', limit || '50'); // default limit — avoids ERR_BAD_RESPONSE
      
      if (search) url.searchParams.append('search', search);
      if (page)   url.searchParams.append('page', page);

      const response = await axios.get(url.toString(), {
          timeout: 15000,
      });

      // If company filter provided, filter client-side
      if (company && typeof company === 'string' && company.trim()) {
        const companyLower = company.trim().toLowerCase();
        const rawData = response.data;
        const list = Array.isArray(rawData) ? rawData : (rawData?.data ?? []);
        const filtered = list.filter(e => (e.company || '').toLowerCase().includes(companyLower));
        return Array.isArray(rawData) ? filtered : { ...rawData, data: filtered, total: filtered.length };
      }

      return response.data;
  };

  try {
      const data = await attempt();
      res.json(data);
  } catch (error) {
      // Token expired — clear and retry once
      if (error.response?.status === 401) {
          hrisToken = null;
          try {
              const data = await attempt();
              return res.json(data);
          } catch (retryErr) {
              console.error("Retry failed:", retryErr.message);
          }
      }
      console.error("Backend Error:", error.response ? error.response.data : (error.message || error.code));
      console.error("Error details:", { code: error.code, url: error.config?.url });
      res.status(500).json({ error: 'Failed to fetch from HRIS' });
  }
});
// ==========================================

// ── Employee Verification (Public) ──
// ── Generate a hash for an employee code (used when printing/generating QR codes) ──
app.get('/api/hash/:empCode', (req, res) => {
  const { empCode } = req.params;
  if (!empCode) return res.status(400).json({ error: 'Employee code required' });
  const hash = hashEmpCode(empCode);
  res.json({ empCode, hash, url: `https://avpass.abas.ph/verify/${hash}` });
});

app.get('/api/verify/:token', async (req, res) => {
  const { token: tokenParam } = req.params;
  if (!tokenParam) return res.status(400).json({ error: 'Token required' });

  const isHash = /^[0-9a-f]{63,64}$/i.test(tokenParam);
  console.log(`[VERIFY] token=${tokenParam} isHash=${isHash}`);

  const ACTIVE_STATUSES = ['probationary','regular','casual','fixed term','part-time'];

  const buildResponse = (emp) => {
    const isActive = ACTIVE_STATUSES.includes((emp.employee_status ?? '').toString().trim().toLowerCase());
    return { found: true, empCode: emp.employee_id, name: emp.full_name, position: emp.position, company: emp.company || '', photo: emp.picture || null, emergencyPerson: emp.emergency_contact_person || '', emergencyNum: emp.emergency_contact_num || '', employmentStatus: emp.employee_status || '', status: isActive ? 'ACTIVE' : 'INACTIVE', isActive };
  };

  const hrisSearch = async (search) => {
    const url = new URL('https://api.avegabros.org/website/id-employees');
    url.searchParams.append('key', process.env.HRIS_API_KEY);
    url.searchParams.append('status', 'Active');
    url.searchParams.append('search', search);
    url.searchParams.append('limit', '10');
    const r = await axios.get(url.toString(), { timeout: 15000 });
    return Array.isArray(r.data) ? r.data : (r.data?.data ?? []);
  };

  const hrisPage = async (order) => {
    const url = new URL('https://api.avegabros.org/website/id-employees');
    url.searchParams.append('key', process.env.HRIS_API_KEY);
    url.searchParams.append('status', 'Active');
    url.searchParams.append('limit', '100');
    url.searchParams.append('page', '0');
    url.searchParams.append('order', order);
    url.searchParams.append('sort', 'id');
    const r = await axios.get(url.toString(), { timeout: 15000 });
    return Array.isArray(r.data) ? r.data : (r.data?.data ?? []);
  };

  try {
    // ── Step 1: Local saved_ids lookup (fastest — no HRIS scan needed) ──
    if (isHash) {
      const savedIds = readSavedIds();
      const localMatch = savedIds.find(e => e.hash && e.hash.toLowerCase() === tokenParam.toLowerCase());
      if (localMatch && localMatch.empCode) {
        console.log(`[VERIFY] local match: empCode=${localMatch.empCode}`);
        try {
          const list = await hrisSearch(localMatch.empCode);
          const emp = list.find(e => (e.employee_id || '').toLowerCase() === localMatch.empCode.toLowerCase());
          if (emp) {
            console.log(`[VERIFY] success via local+hris: ${emp.employee_id}`);
            return res.json(buildResponse(emp));
          }
        } catch (hrisErr) {
          console.log(`[VERIFY] HRIS unreachable, using cached data: ${hrisErr.message}`);
          return res.json({ found: true, empCode: localMatch.empCode, name: localMatch.employeeName, position: localMatch.position || '', company: localMatch.company || '', photo: null, emergencyPerson: '', emergencyNum: '', employmentStatus: '', status: 'ACTIVE', isActive: true });
        }
      }
    }

    // ── Step 2: In-memory hash cache ──
    if (isHash) {
      const cachedEmpCode = getCachedEmpCode(tokenParam.toLowerCase());
      if (cachedEmpCode) {
        console.log(`[VERIFY] cache hit: empCode=${cachedEmpCode}`);
        const list = await hrisSearch(cachedEmpCode);
        const emp = list.find(e => (e.employee_id || '').toLowerCase() === cachedEmpCode.toLowerCase());
        if (emp) {
          console.log(`[VERIFY] success via cache: ${emp.employee_id}`);
          return res.json(buildResponse(emp));
        }
      }
    }

    // ── Step 3: Full employee list cache — hash match ──
    let emp;

    if (isHash) {
      const allEmployees = await getEmployeeList();
      console.log(`[VERIFY] scanning cache of ${allEmployees.length} employees`);
      emp = allEmployees.find(e => hashEmpCode(e.employee_id || '') === tokenParam.toLowerCase());
      if (emp) {
        setCachedEmpCode(tokenParam.toLowerCase(), emp.employee_id);
        // Fetch fresh status from HRIS using direct search
        try {
          const list = await hrisSearch(emp.employee_id);
          const fresh = list.find(e => (e.employee_id || '').toLowerCase() === emp.employee_id.toLowerCase());
          if (fresh) emp = fresh;
        } catch (e) { /* use cached version */ }
      }
    } else {
      // Legacy: direct employee_id search
      const list = await hrisSearch(tokenParam);
      console.log(`[VERIFY] legacy list=${list.length}`);
      emp = list.find(e => (e.employee_id || '').toLowerCase() === tokenParam.toLowerCase()) || list[0];
    }

    console.log(`[VERIFY] final emp=${emp?.employee_id ?? 'NOT FOUND'}`);
    if (!emp) return res.status(404).json({ found: false, status: 'NOT FOUND' });

    return res.json(buildResponse(emp));

  } catch (error) {
    if (error.response?.status === 401) {
      hrisToken = null;
      return res.status(503).json({ error: 'Auth error, please retry' });
    }
    console.error('[VERIFY] Error:', error.message);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// ── Company Logo ──
app.get('/api/company-logo', (req, res) => {
  const exts = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'];
  const searchDirs = [
    path.join(DATA_PATH, 'images'),                      // backend/data/images/ (local dev)
    path.join(__dirname, '..', 'data', 'images'),         // ../data/images/ (production)
    path.join(__dirname, '..', '..', 'data', 'images'),   // ../../data/images/ (docker volume)
  ];
  console.log('[LOGO] searching in:', searchDirs);
  for (const dir of searchDirs) {
    for (const ext of exts) {
      const filePath = path.join(dir, `company-logo.${ext}`);
      if (fs.existsSync(filePath)) {
        console.log('[LOGO] found at:', filePath);
        return res.sendFile(filePath);
      }
    }
  }
  console.log('[LOGO] not found in any location');
  res.status(404).send('No logo');
});

// ── Verification Page (served at /verify/:token) ──
app.get('/verify/:token', (req, res) => {
  const { token: tokenParam } = req.params;
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>ID Verification — AVPass</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{min-height:100vh;display:flex;align-items:center;justify-content:center;
      background:linear-gradient(135deg,#667eea 0%,#764ba2 50%,#ec4899 100%);
      font-family:'Segoe UI',system-ui,sans-serif;padding:24px}
    .card{background:#fff;border-radius:24px;padding:40px 32px;max-width:400px;width:100%;
      box-shadow:0 24px 64px rgba(0,0,0,0.2);text-align:center;animation:pop 0.4s cubic-bezier(0.34,1.56,0.64,1)}
    @keyframes pop{from{opacity:0;transform:scale(0.85)}to{opacity:1;transform:scale(1)}}
    .logo{width:80px;height:80px;display:flex;align-items:center;justify-content:center;
      margin:0 auto 16px}
    .logo img{max-width:80px;max-height:80px;object-fit:contain;border-radius:8px}
    .logo-fallback{background:linear-gradient(135deg,#667eea,#764ba2);border-radius:16px;
      width:56px;height:56px;display:flex;align-items:center;justify-content:center;
      box-shadow:0 8px 24px rgba(102,126,234,0.4);font-size:24px}
    .brand{font-size:11px;font-weight:700;letter-spacing:3px;color:#94a3b8;
      text-transform:uppercase;margin-bottom:24px}
    .photo{width:88px;height:88px;border-radius:50%;object-fit:cover;
      border:4px solid #f1f5f9;margin:0 auto 16px;display:block;
      box-shadow:0 4px 16px rgba(0,0,0,0.1)}
    .photo-placeholder{width:88px;height:88px;border-radius:50%;background:#e2e8f0;
      display:flex;align-items:center;justify-content:center;margin:0 auto 16px;
      font-size:32px;font-weight:700;color:#94a3b8}
    .name{font-size:20px;font-weight:800;color:#0f172a;margin-bottom:4px}
    .position{font-size:13px;color:#64748b;margin-bottom:4px}
    .company{font-size:12px;color:#94a3b8;margin-bottom:24px}
    .badge{display:inline-flex;align-items:center;gap:10px;padding:14px 28px;
      border-radius:16px;font-size:18px;font-weight:800;letter-spacing:1px;margin-bottom:24px}
    .badge.active{background:#ecfdf5;color:#059669;border:2px solid #a7f3d0}
    .badge.inactive{background:#fef2f2;color:#dc2626;border:2px solid #fecaca}
    .badge .dot{width:12px;height:12px;border-radius:50%;flex-shrink:0}
    .badge.active .dot{background:#10b981;box-shadow:0 0 0 3px #a7f3d055}
    .badge.inactive .dot{background:#ef4444;box-shadow:0 0 0 3px #fecaca55}
    .footer{font-size:11px;color:#cbd5e1;margin-top:8px}
    .loading{color:#94a3b8;font-size:14px;margin:24px 0}
    .error{background:#fef2f2;color:#dc2626;padding:16px;border-radius:12px;
      font-size:13px;margin:16px 0;border:1px solid #fecaca}
    .spinner{width:32px;height:32px;border:3px solid #e2e8f0;border-top-color:#667eea;
      border-radius:50%;animation:spin 0.8s linear infinite;margin:16px auto}
    @keyframes spin{to{transform:rotate(360deg)}}
  </style>
</head>
<body>
  <div class="card" id="card">
    <div class="logo" id="logo-wrap">
      <img src="/api/company-logo" id="company-logo-img" alt="" style="max-width:80px;max-height:80px;object-fit:contain;border-radius:8px"/>
      <div id="logo-fallback" class="logo-fallback" style="display:none">🛡</div>
    </div>
    <div class="brand">AVPass ID Verification</div>
    <div class="spinner"></div>
    <div class="loading">Verifying employee ID...</div>
  </div>
  <script>
    // Handle logo fallback safely — no innerHTML needed
    var logoImg = document.getElementById('company-logo-img');
    var logoFallback = document.getElementById('logo-fallback');
    if (logoImg) {
      logoImg.onerror = function() {
        logoImg.style.display = 'none';
        logoFallback.style.display = 'flex';
      };
    }

    function makeLogo() {
      var wrap = document.createElement('div');
      wrap.className = 'logo';
      var img = document.createElement('img');
      img.src = '/api/company-logo';
      img.style.cssText = 'max-width:80px;max-height:80px;object-fit:contain;border-radius:8px';
      var fb = document.createElement('div');
      fb.className = 'logo-fallback';
      fb.style.display = 'none';
      fb.textContent = '🛡';
      img.onerror = function() { img.style.display = 'none'; fb.style.display = 'flex'; };
      wrap.appendChild(img);
      wrap.appendChild(fb);
      return wrap.outerHTML;
    }

    (async () => {
      const tokenParam = ${JSON.stringify(tokenParam)};
      const card = document.getElementById('card');
      const LOGO = makeLogo();

      function setCard(html) {
        card.innerHTML = LOGO + html;
      }

      try {
        const res = await fetch('/api/verify/' + encodeURIComponent(tokenParam));
        const data = await res.json();

        if (!data.found) {
          setCard(
            '<div class="brand">AVPass ID Verification</div>' +
            '<div class="error">⚠ Employee not found. This ID card may be invalid or not registered in the system.</div>' +
            '<div class="footer">If you believe this is an error, please contact HR.</div>'
          );
          return;
        }

        const initial = (data.name || '?').charAt(0);
        const photoFilename = data.photo ? data.photo.split('/').pop() : '';
        const photoUrl = photoFilename ? '/images/' + photoFilename : '';

        let photoHtml = '<div class="photo-placeholder">' + initial + '</div>';
        if (photoUrl) {
          photoHtml = '<img class="photo" id="emp-photo" src="' + photoUrl + '" crossorigin="anonymous"/>' +
                      '<div class="photo-placeholder" id="emp-initial" style="display:none">' + initial + '</div>';
        }

        const badgeClass = data.isActive ? 'active' : 'inactive';
        const companyHtml = data.company ? '<div class="company">' + data.company + '</div>' : '';

        setCard(
          '<div class="brand">AVPass ID Verification</div>' +
          photoHtml +
          '<div class="name">' + (data.name || '—') + '</div>' +
          '<div class="position">' + (data.position || '') + '</div>' +
          companyHtml +
          '<div class="badge ' + badgeClass + '"><div class="dot"></div>' + data.status + '</div>' +
          '<div class="footer">Verified · ' + new Date().toLocaleString() + '</div>'
        );

        // Re-attach logo fallback handler after innerHTML reset
        var newLogoImg = card.querySelector('img[src="/api/company-logo"]');
        var newFb = card.querySelector('.logo-fallback');
        if (newLogoImg && newFb) {
          newLogoImg.onerror = function() { newLogoImg.style.display = 'none'; newFb.style.display = 'flex'; };
        }

        // Handle employee photo error
        const imgEl = document.getElementById('emp-photo');
        const initEl = document.getElementById('emp-initial');
        if (imgEl && initEl) {
          imgEl.onerror = function() { imgEl.style.display = 'none'; initEl.style.display = 'flex'; };
        }

      } catch(e) {
        setCard(
          '<div class="brand">AVPass ID Verification</div>' +
          '<div class="error">⚠ Could not connect to verification server. Please try again.</div>'
        );
      }
    })();
  </script>
</body>
</html>`);
});

// ==========================================

// ==========================================
// AUTH — persisted to data/users.json
// ==========================================

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function loadUsers() {
  if (fs.existsSync(USERS_FILE)) {
    try { return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8')); } catch {}
  }
  // First-run: seed a default admin account so you can always log in
  const defaultUsers = [
    { id: 1, username: 'admin', passwordHash: hashPassword('admin123'), role: 'admin', createdAt: new Date().toISOString() }
  ];
  fs.writeFileSync(USERS_FILE, JSON.stringify(defaultUsers, null, 2));
  console.log('[AUTH] Created default admin account (admin / admin123)');
  return defaultUsers;
}

function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function generateToken(user) {
  // Simple signed token: base64(payload).base64(signature)
  const payload = Buffer.from(JSON.stringify({ id: user.id, username: user.username, role: user.role })).toString('base64');
  const secret = process.env.JWT_SECRET || 'avpass-secret-key';
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

function verifyToken(token) {
  try {
    const [payload, sig] = token.split('.');
    const secret = process.env.JWT_SECRET || 'avpass-secret-key';
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    if (sig !== expected) return null;
    return JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
  } catch { return null; }
}

// POST /api/auth/login
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ message: 'Username and password required' });
  const users = loadUsers();
  const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
  if (!user || user.passwordHash !== hashPassword(password)) {
    return res.status(401).json({ message: 'Invalid username or password' });
  }
  const token = generateToken(user);
  console.log(`[AUTH] Login: ${user.username} (${user.role})`);
  res.json({ token, username: user.username, role: user.role });
});

// GET /api/auth/users — list all accounts (no passwords)
app.get('/api/auth/users', (req, res) => {
  const users = loadUsers().map(({ passwordHash, ...u }) => u);
  res.json(users);
});

// POST /api/auth/users — create new account
app.post('/api/auth/users', (req, res) => {
  const { username, password, role } = req.body || {};
  if (!username || !password) return res.status(400).json({ message: 'Username and password required' });
  if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });
  const users = loadUsers();
  if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
    return res.status(409).json({ message: 'Username already exists' });
  }
  const newUser = {
    id: Date.now(),
    username: username.trim(),
    passwordHash: hashPassword(password),
    role: role === 'admin' ? 'admin' : 'user',
    createdAt: new Date().toISOString(),
  };
  users.push(newUser);
  saveUsers(users);
  console.log(`[AUTH] Created user: ${newUser.username} (${newUser.role})`);
  const { passwordHash, ...safe } = newUser;
  res.status(201).json(safe);
});

// DELETE /api/auth/users/:id
app.delete('/api/auth/users/:id', (req, res) => {
  const users = loadUsers();
  const idx = users.findIndex(u => String(u.id) === String(req.params.id));
  if (idx === -1) return res.status(404).json({ message: 'User not found' });
  const removed = users.splice(idx, 1)[0];
  saveUsers(users);
  console.log(`[AUTH] Deleted user: ${removed.username}`);
  res.sendStatus(200);
});

// PATCH /api/auth/users/:id/password
app.patch('/api/auth/users/:id/password', (req, res) => {
  const { password } = req.body || {};
  if (!password || password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });
  const users = loadUsers();
  const user = users.find(u => String(u.id) === String(req.params.id));
  if (!user) return res.status(404).json({ message: 'User not found' });
  user.passwordHash = hashPassword(password);
  saveUsers(users);
  console.log(`[AUTH] Password changed for: ${user.username}`);
  res.sendStatus(200);
});

// ==========================================

// Database
app.get('/api/database', (req, res) => {
  res.json(fs.existsSync(DB_FILE) ? JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) : []);
});
app.post('/api/database', (req, res) => {
  fs.writeFileSync(DB_FILE, JSON.stringify(req.body, null, 2));
  console.log(`[SUCCESS] database.json saved (${req.body.length} items)`);
  res.sendStatus(200);
});

// Records
app.get('/api/records', (req, res) => {
  res.json(fs.existsSync(RECORDS_FILE) ? JSON.parse(fs.readFileSync(RECORDS_FILE, 'utf8')) : []);
});
app.post('/api/records', (req, res) => {
  fs.writeFileSync(RECORDS_FILE, JSON.stringify(req.body, null, 2));
  console.log(`[SUCCESS] records.json saved (${req.body.length} items)`);
  res.sendStatus(200);
});
app.delete('/api/records/:id', (req, res) => {
  if (!fs.existsSync(RECORDS_FILE)) return res.sendStatus(404);
  const records = JSON.parse(fs.readFileSync(RECORDS_FILE, 'utf8'));
  const target = records.find(r => String(r.id) === req.params.id);
  if (target) { deleteImageFile(target.signature); deleteImageFile(target.photo); }
  fs.writeFileSync(RECORDS_FILE, JSON.stringify(records.filter(r => String(r.id) !== req.params.id), null, 2));
  res.sendStatus(200);
});

// Templates — saves full front/back layout including background images as base64
app.get('/api/templates', (req, res) => {
  res.json(fs.existsSync(TEMPLATES_FILE) ? JSON.parse(fs.readFileSync(TEMPLATES_FILE, 'utf8')) : []);
});
app.post('/api/templates', (req, res) => {
  fs.writeFileSync(TEMPLATES_FILE, JSON.stringify(req.body, null, 2));
  console.log(`[SUCCESS] templates.json saved (${req.body.length} templates)`);
  res.sendStatus(200);
});

// Health check endpoint
app.get(['/health', '/api/health'], (req, res) => {
  res.json({ status: 'UP', timestamp: new Date().toISOString() });
});

// Saved IDs — stores rendered front+back PNG as base64 per employee
const IDS_FILE = path.join(DATA_PATH, 'saved_ids.json');

const readSavedIds = () => fs.existsSync(IDS_FILE) ? JSON.parse(fs.readFileSync(IDS_FILE, 'utf8')) : [];

app.get('/api/saved-ids', (req, res) => {
  let data = readSavedIds();
  if (req.query.empCode) {
    const code = req.query.empCode.toLowerCase();
    data = data.filter(e => (e.empCode || '').toLowerCase() === code);
  }
  res.json(data);
});
app.post('/api/saved-ids', async (req, res) => {
  const existing = readSavedIds();
  const newEntry = req.body; // { id, employeeName, empCode, company, frontImg, backImg, avatarImg, signatureImg, savedAt, abasRequestId, abasEmployeeId }
  // Auto-generate hash from empCode if provided
  if (newEntry.empCode && !newEntry.hash) {
    newEntry.hash = hashEmpCode(newEntry.empCode);
  }
  
  newEntry.abasRequestId = newEntry.abasRequestId || null;
  newEntry.abasEmployeeId = newEntry.abasEmployeeId || null;

  // Upload to MinIO bucket 'abas' under employees/employee-id folder
  const empIdFolder = newEntry.empCode || newEntry.abasEmployeeId || newEntry.employeeName || 'unknown';
  const cleanedEmpId = String(empIdFolder)
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_\-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');

  if (newEntry.frontImg && newEntry.frontImg.startsWith('data:')) {
    newEntry.frontImg = await uploadBase64ToAbasMinio(newEntry.frontImg, `employees/${cleanedEmpId}/company_id_front.png`, 'image/png');
  }
  if (newEntry.backImg && newEntry.backImg.startsWith('data:')) {
    newEntry.backImg = await uploadBase64ToAbasMinio(newEntry.backImg, `employees/${cleanedEmpId}/company_id_back.png`, 'image/png');
  }
  if (newEntry.avatarImg && newEntry.avatarImg.startsWith('data:')) {
    newEntry.avatarImg = await uploadBase64ToAbasMinio(newEntry.avatarImg, `employees/${cleanedEmpId}/avatar.png`, 'image/png');
  }
  if (newEntry.signatureImg && newEntry.signatureImg.startsWith('data:')) {
    newEntry.signatureImg = await uploadBase64ToAbasMinio(newEntry.signatureImg, `employees/${cleanedEmpId}/signature.png`, 'image/png');
  }

  // Replace if same employee+company already exists
  const updated = [...existing.filter(e => !(e.employeeName === newEntry.employeeName && e.company === newEntry.company)), newEntry];
  fs.writeFileSync(IDS_FILE, JSON.stringify(updated, null, 2));
  console.log(`[SUCCESS] ID saved for ${newEntry.employeeName} (empCode=${newEntry.empCode} hash=${newEntry.hash})`);
  res.sendStatus(200);
});
app.delete('/api/saved-ids/:id', (req, res) => {
  if (!fs.existsSync(IDS_FILE)) return res.sendStatus(404);
  const updated = JSON.parse(fs.readFileSync(IDS_FILE, 'utf8')).filter(e => e.id !== req.params.id);
  fs.writeFileSync(IDS_FILE, JSON.stringify(updated, null, 2));
  res.sendStatus(200);
});
app.patch('/api/saved-ids/:id', async (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(IDS_FILE, 'utf8'));
    const idx = data.findIndex(e => String(e.id) === String(req.params.id));
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    
    const updates = req.body;
    const empIdFolder = updates.empCode || data[idx].empCode || updates.abasEmployeeId || data[idx].abasEmployeeId || updates.employeeName || data[idx].employeeName || 'unknown';
    const cleanedEmpId = String(empIdFolder)
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9_\-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');

    if (updates.frontImg && updates.frontImg.startsWith('data:')) {
      updates.frontImg = await uploadBase64ToAbasMinio(updates.frontImg, `employees/${cleanedEmpId}/company_id_front.png`, 'image/png');
    }
    if (updates.backImg && updates.backImg.startsWith('data:')) {
      updates.backImg = await uploadBase64ToAbasMinio(updates.backImg, `employees/${cleanedEmpId}/company_id_back.png`, 'image/png');
    }
    if (updates.avatarImg && updates.avatarImg.startsWith('data:')) {
      updates.avatarImg = await uploadBase64ToAbasMinio(updates.avatarImg, `employees/${cleanedEmpId}/avatar.png`, 'image/png');
    }
    if (updates.signatureImg && updates.signatureImg.startsWith('data:')) {
      updates.signatureImg = await uploadBase64ToAbasMinio(updates.signatureImg, `employees/${cleanedEmpId}/signature.png`, 'image/png');
    }

    data[idx] = { ...data[idx], ...updates };
    fs.writeFileSync(IDS_FILE, JSON.stringify(data, null, 2));
    res.json(data[idx]);
  } catch (e) {
    console.error('[PATCH saved-ids] Error:', e.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── ID Requests ──
const ID_REQUESTS_FILE = path.join(DATA_PATH, 'id_requests.json');

const readRequests = () => fs.existsSync(ID_REQUESTS_FILE) ? JSON.parse(fs.readFileSync(ID_REQUESTS_FILE, 'utf8')) : [];
const writeRequests = (data) => fs.writeFileSync(ID_REQUESTS_FILE, JSON.stringify(data, null, 2));

// GET all requests
app.get('/api/id-requests', (req, res) => {
  res.json(readRequests());
});

// POST create new request
app.post('/api/id-requests', (req, res) => {
  const requests = readRequests();
  const now = new Date().toISOString();
  const newReq = {
    id: `REQ-${Date.now()}`,
    employeeName: req.body.employeeName || '',
    empCode:      req.body.empCode      || '',
    company:      req.body.company      || '',
    department:   req.body.department   || '',
    position:     req.body.position     || '',
    purpose:      req.body.purpose      || '',
    requestedBy:  req.body.requestedBy  || 'unknown',
    status: 'pending',
    statusHistory: [{ status: 'pending', note: 'Request submitted', changedAt: now }],
    createdAt: now,
    updatedAt: now,
    abasRequestId: req.body.abasRequestId || null,
    abasEmployeeId: req.body.abasEmployeeId || null,
    iraafId:       req.body.iraafId       || null,
    pictureUrl:    req.body.pictureUrl    || null,
    signatureUrl:  req.body.signatureUrl  || null,
    supportingDocUrl: req.body.supportingDocUrl || null,
    verifierName:  req.body.verifierName  || null,
    approverName:  req.body.approverName  || null,
  };
  requests.unshift(newReq);
  writeRequests(requests);
  console.log(`[ID REQUEST] Created ${newReq.id} for ${newReq.employeeName}`);
  res.status(201).json(newReq);
});

// POST /api/notify-abas  — called by fluffy frontend when ID is saved & ready
app.post('/api/notify-abas', express.json(), async (req, res) => {
  const { abasRequestId, savedIdId } = req.body;
  if (!abasRequestId || !savedIdId) {
    return res.status(400).json({ error: 'abasRequestId and savedIdId required' });
  }

  const ABAS_URL = process.env.ABAS_URL || 'https://abas.avegabros.net';
  const ABAS_API_KEY = process.env.ABAS_API_KEY || '';

  try {
    const savedIds = readSavedIds();
    const entry = savedIds.find(e => String(e.id) === String(savedIdId));
    if (!entry) return res.status(404).json({ error: 'Saved ID not found' });

    const payload = {
      abasRequestId,
      savedIdId: entry.id,
      empCode: entry.empCode,
      employeeName: entry.employeeName,
      frontImgFilename: entry.frontImg ? entry.frontImg.split('/').pop() : null,
      backImgFilename: entry.backImg ? entry.backImg.split('/').pop() : null,
      savedAt: entry.savedAt,
    };

    const response = await axios.post(
      `${ABAS_URL.replace(/\/$/, '')}/Corporate_Services/id_ready_webhook`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Abas-Api-Key': ABAS_API_KEY,
        },
        timeout: 10000,
      }
    );

    console.log(`[NOTIFY-ABAS] Notified ABAS for request ${abasRequestId}:`, response.status);
    res.json({ success: true, status: response.status });
  } catch (err) {
    console.error('[NOTIFY-ABAS] Failed to notify ABAS:', err.message);
    res.status(500).json({ error: 'Failed to notify ABAS', detail: err.message });
  }
});

// GET /api/test-abas-connection — Test connection to ABAS webhook
app.get('/api/test-abas-connection', async (req, res) => {
  const ABAS_URL = process.env.ABAS_URL || 'https://abas.avegabros.net';
  const ABAS_API_KEY = process.env.ABAS_API_KEY || '';

  try {
    const response = await axios.post(
      `${ABAS_URL.replace(/\/$/, '')}/Corporate_Services/webhook_handshake`,
      {},
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Abas-Api-Key': ABAS_API_KEY,
        },
        timeout: 5000,
      }
    );
    res.json({ success: true, message: 'Handshake successful!', data: response.data });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Handshake failed', detail: err.message });
  }
});

// Webhook helper to notify ABAS of status changes
async function notifyAbasOfStatus(abasRequestId, status, details = {}) {
  if (!abasRequestId) return;
  const ABAS_URL = process.env.ABAS_URL || 'https://abas.avegabros.net';
  const ABAS_API_KEY = process.env.ABAS_API_KEY || '';

  try {
    const payload = {
      abasRequestId,
      status,
      ...details
    };
    
    const response = await axios.post(
      `${ABAS_URL.replace(/\/$/, '')}/Corporate_Services/id_status_webhook`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Abas-Api-Key': ABAS_API_KEY,
        },
        timeout: 10000,
      }
    );
    console.log(`[NOTIFY-ABAS-STATUS] Status updated for request ${abasRequestId} to ${status}:`, response.status);
    return true;
  } catch (err) {
    console.error(`[NOTIFY-ABAS-STATUS] Failed to update ABAS status for request ${abasRequestId}:`, err.message);
    return false;
  }
}

// POST update request status by abasRequestId (called by ABAS sync)
app.post('/api/id-requests/abas/:abasRequestId', express.json(), (req, res) => {
  const requests = readRequests();
  const abasId = req.params.abasRequestId;
  const idx = requests.findIndex(r => r.abasRequestId && String(r.abasRequestId) === String(abasId));
  if (idx === -1) return res.status(404).json({ error: 'Request not found' });

  const existing = requests[idx];
  const now = new Date().toISOString();
  const { status, note, iraafNo } = req.body;
  let changed = false;

  if (iraafNo && existing.iraafId !== iraafNo) {
    existing.iraafId = iraafNo;
    changed = true;
  }

  if (status && status.toLowerCase() !== existing.status) {
    existing.status = status.toLowerCase(); // Map to lowercase AVPass statuses
    existing.statusHistory = [
      ...(existing.statusHistory || []),
      { status: status.toLowerCase(), note: note || 'Updated from ABAS IT Helpdesk', changedAt: now }
    ];
    existing.updatedAt = now;
    changed = true;
  }

  if (changed) {
    requests[idx] = existing;
    writeRequests(requests);
    console.log(`[ID REQUEST Webhook] Updated ${existing.id} → status: ${existing.status}, iraafId: ${existing.iraafId} via ABAS sync`);
  }
  res.json(existing);
});

// PATCH update request (fields or status)
app.patch('/api/id-requests/:id', async (req, res) => {
  const requests = readRequests();
  const idx = requests.findIndex(r => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });

  const existing = requests[idx];
  const now = new Date().toISOString();
  const { status, note, ...fields } = req.body;

  // Merge editable fields
  const updated = { ...existing, ...fields, updatedAt: now };

  // If status is being changed, push to history
  if (status && status !== existing.status) {
    updated.status = status;
    updated.statusHistory = [
      ...(existing.statusHistory || []),
      { status, note: note || '', changedAt: now },
    ];

    // Trigger ABAS notification of status change
    if (updated.abasRequestId) {
      await notifyAbasOfStatus(updated.abasRequestId, status, {
        requestId: updated.id,
        employeeName: updated.employeeName,
        empCode: updated.empCode,
        iraafId: updated.iraafId,
        note: note || ''
      });
    }
  }

  requests[idx] = updated;
  writeRequests(requests);
  console.log(`[ID REQUEST] Updated ${req.params.id} → status: ${updated.status}`);
  res.json(updated);
});

// DELETE request
app.delete('/api/id-requests/:id', (req, res) => {
  const requests = readRequests();
  const target = requests.find(r => r.id === req.params.id);
  if (!target) return res.status(404).json({ error: 'Not found' });
  writeRequests(requests.filter(r => r.id !== req.params.id));
  console.log(`[ID REQUEST] Deleted ${req.params.id}`);
  res.sendStatus(200);
});

// ── Serve built frontend from dist/ ──
const DIST_PATH = path.join(__dirname, '..', 'dist');
if (fs.existsSync(DIST_PATH)) {
  app.use(express.static(DIST_PATH));
  // Catch-all: return index.html for any non-API route (React Router support)
  app.get('/{*path}', (req, res) => {
    res.sendFile(path.join(DIST_PATH, 'index.html'));
  });
  console.log(`[STATIC] Serving frontend from: ${DIST_PATH}`);
} else {
  console.warn(`[STATIC] No dist/ folder found. Run 'npm run build' first.`);
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`-----------------------------------------`);
  console.log(`Server is LIVE on port ${PORT}`);
  console.log(`Open: http://localhost:${PORT}`);
  console.log(`Images saved to: ${IMAGES_PATH}`);
  console.log(`-----------------------------------------`);
});
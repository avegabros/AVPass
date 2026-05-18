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

// Recreate __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    const mime = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif' };
    if (mime[ext]) res.setHeader('Content-Type', mime[ext]);
    return res.sendFile(localPath);
  }

  // 2. Fetch from remote — try photos folder first, then signatures folder
  const BASE = 'https://abas-staging.avegabros.net/';
  const remotePaths = [
    `assets/uploads/hr/employee_pictures/${filename}`,
    `assets/uploads/users/signatures/${filename}`,
    `assets/uploads/hr/employee_pictures/${filename}.png`,
    `assets/uploads/hr/employee_pictures/${filename}.jpg`,
    `assets/uploads/hr/employee_pictures/${filename}.jpeg`,
    `assets/uploads/users/signatures/${filename}.png`,
  ];

  for (const remotePath of remotePaths) {
    const remoteUrl = BASE + remotePath;
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
      return new Promise((resolve) => {
        writer.on('finish', () => { console.log(`[PROXY] Cached: ${filename}`); res.sendFile(localPath); resolve(undefined); });
        writer.on('error', (err) => { console.error('[PROXY] Write error:', err); res.status(500).send('Storage error'); resolve(undefined); });
      });
    } catch { continue; }
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

function deleteImageFile(url) {
  if (!url || url.startsWith('data:')) return;
  const filePath = path.join(__dirname, url);
  if (fs.existsSync(filePath)) { fs.unlinkSync(filePath); console.log(`[IMAGE DELETED] ${url}`); }
}

// ==========================================
// NEW HRIS API INTEGRATION
// ==========================================
let hrisToken = null;

async function getHrisToken() {
  if (hrisToken) return hrisToken; 
  
  try {
    // We need to attach the API key to the login URL as well
    const loginUrl = new URL(process.env.HRIS_URL);
    loginUrl.searchParams.append('key', process.env.HRIS_API_KEY);

    const response = await axios.post(loginUrl.toString(), {
        username: process.env.HRIS_USERNAME,
        password: process.env.HRIS_PASSWORD
    });
    
    hrisToken = response.data.token;
    return hrisToken;
  } catch (error) {
    console.error("HRIS Login Error:", error.response ? error.response.data : error.message);
    throw error;
  }
}

app.get('/api/employees', async (req, res) => {
  try {
      const token = await getHrisToken();
      const { search, page, limit, company } = req.query;
      
      const url = new URL('https://api.avegabros.org/website/id-employees');
      url.searchParams.append('key', process.env.HRIS_API_KEY);
      url.searchParams.append('order', 'asc');
      url.searchParams.append('sort', 'id');
      
      if (search) url.searchParams.append('search', search);
      if (page) url.searchParams.append('page', page);
      if (limit) url.searchParams.append('limit', limit);

      const response = await axios.get(url.toString(), {
          headers: { 'Authorization': `Bearer ${token}` }
      });

      // If company filter is provided, filter client-side (HRIS API may not support it natively)
      if (company && typeof company === 'string' && company.trim()) {
        const companyLower = company.trim().toLowerCase();
        const rawData = response.data;
        const list = Array.isArray(rawData) ? rawData : (rawData?.data ?? []);
        const filtered = list.filter(e =>
          (e.company || '').toLowerCase().includes(companyLower)
        );
        if (Array.isArray(rawData)) {
          return res.json(filtered);
        } else {
          return res.json({ ...rawData, data: filtered, total: filtered.length });
        }
      }

      res.json(response.data);
  } catch (error) {
      // If token expired (401), clear it so it fetches a new one next time
      if (error.response && error.response.status === 401) {
          hrisToken = null;
      }
      console.error("Backend Error:", error.response ? error.response.data : error.message);
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
  res.json({ empCode, hash, url: `/verify/${hash}` });
});

app.get('/api/verify/:token', async (req, res) => {
  const { token: tokenParam } = req.params;
  if (!tokenParam) return res.status(400).json({ error: 'Token required' });

  // Detect whether the param is a 64-char hex hash or a raw employee code
  const isHash = /^[0-9a-f]{64}$/i.test(tokenParam);

  try {
    const token = await getHrisToken();

    let emp;

    if (isHash) {
      // Hash mode: fetch all employees and find the one whose hashed ID matches
      const url = new URL('https://api.avegabros.org/website/id-employees');
      url.searchParams.append('key', process.env.HRIS_API_KEY);
      url.searchParams.append('limit', '9999');

      const response = await axios.get(url.toString(), {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const list = Array.isArray(response.data) ? response.data : (response.data?.data ?? []);
      emp = list.find(e => hashEmpCode(e.employee_id || '') === tokenParam.toLowerCase());
    } else {
      // Legacy/direct mode: search by employee code directly
      const url = new URL('https://api.avegabros.org/website/id-employees');
      url.searchParams.append('key', process.env.HRIS_API_KEY);
      url.searchParams.append('search', tokenParam);
      url.searchParams.append('limit', '1');

      const response = await axios.get(url.toString(), {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const list = Array.isArray(response.data) ? response.data : (response.data?.data ?? []);
      emp = list.find(e =>
        (e.employee_id || '').toLowerCase() === tokenParam.toLowerCase()
      ) || list[0];
    }

    if (!emp) return res.status(404).json({ found: false, status: 'NOT FOUND' });

    const ACTIVE_EMPLOYMENT_STATUSES = [
      'probationary',
      'regular',
      'casual',
      'fixed term',
      'part-time',
    ];
    const employmentStatus = (emp.employee_status ?? '').toString().trim().toLowerCase();
    const isActive = ACTIVE_EMPLOYMENT_STATUSES.includes(employmentStatus);

    res.json({
      found: true,
      empCode: emp.employee_id,
      name: emp.full_name,
      position: emp.position,
      company: emp.company || '',
      photo: emp.picture || null,
      emergencyPerson: emp.emergency_contact_person || '',
      emergencyNum: emp.emergency_contact_num || '',
      employmentStatus: emp.employee_status || '',
      status: isActive ? 'ACTIVE' : 'INACTIVE',
      isActive,
    });
  } catch (error) {
    if (error.response?.status === 401) {
      hrisToken = null;
      return res.status(503).json({ error: 'Auth error, please retry' });
    }
    console.error('[VERIFY] Error:', error.message);
    res.status(500).json({ error: 'Verification failed' });
  }
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
    .logo{background:linear-gradient(135deg,#667eea,#764ba2);border-radius:16px;
      width:56px;height:56px;display:flex;align-items:center;justify-content:center;
      margin:0 auto 20px;box-shadow:0 8px 24px rgba(102,126,234,0.4);font-size:24px}
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
    <div class="logo">🛡</div>
    <div class="brand">AVPass ID Verification</div>
    <div class="spinner"></div>
    <div class="loading">Verifying employee ID...</div>
  </div>
  <script>
    (async () => {
      const tokenParam = ${JSON.stringify(tokenParam)};
      const card = document.getElementById('card');

      function setCard(html) {
        card.innerHTML = html;
      }

      try {
        const res = await fetch('/api/verify/' + encodeURIComponent(tokenParam));
        const data = await res.json();

        if (!data.found) {
          setCard(
            '<div class="logo">🛡</div>' +
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
          '<div class="logo">🛡</div>' +
          '<div class="brand">AVPass ID Verification</div>' +
          photoHtml +
          '<div class="name">' + (data.name || '—') + '</div>' +
          '<div class="position">' + (data.position || '') + '</div>' +
          companyHtml +
          '<div class="badge ' + badgeClass + '"><div class="dot"></div>' + data.status + '</div>' +
          '<div class="footer">Verified · ' + new Date().toLocaleString() + '</div>'
        );

        // Handle photo load error after DOM is set
        const imgEl = document.getElementById('emp-photo');
        const initEl = document.getElementById('emp-initial');
        if (imgEl && initEl) {
          imgEl.onerror = function() {
            imgEl.style.display = 'none';
            initEl.style.display = 'flex';
          };
        }

      } catch(e) {
        setCard(
          '<div class="logo">🛡</div>' +
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

// Saved IDs — stores rendered front+back PNG as base64 per employee
const IDS_FILE = path.join(DATA_PATH, 'saved_ids.json');

app.get('/api/saved-ids', (req, res) => {
  res.json(fs.existsSync(IDS_FILE) ? JSON.parse(fs.readFileSync(IDS_FILE, 'utf8')) : []);
});
app.post('/api/saved-ids', (req, res) => {
  const existing = fs.existsSync(IDS_FILE) ? JSON.parse(fs.readFileSync(IDS_FILE, 'utf8')) : [];
  const newEntry = req.body; // { id, employeeName, company, frontImg, backImg, savedAt }
  // Replace if same employee+company already exists
  const updated = [...existing.filter(e => !(e.employeeName === newEntry.employeeName && e.company === newEntry.company)), newEntry];
  fs.writeFileSync(IDS_FILE, JSON.stringify(updated, null, 2));
  console.log(`[SUCCESS] ID saved for ${newEntry.employeeName}`);
  res.sendStatus(200);
});
app.delete('/api/saved-ids/:id', (req, res) => {
  if (!fs.existsSync(IDS_FILE)) return res.sendStatus(404);
  const updated = JSON.parse(fs.readFileSync(IDS_FILE, 'utf8')).filter(e => e.id !== req.params.id);
  fs.writeFileSync(IDS_FILE, JSON.stringify(updated, null, 2));
  res.sendStatus(200);
});
app.patch('/api/saved-ids/:id', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(IDS_FILE, 'utf8'));
    const idx = data.findIndex(e => String(e.id) === String(req.params.id));
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    data[idx] = { ...data[idx], ...req.body };
    fs.writeFileSync(IDS_FILE, JSON.stringify(data, null, 2));
    res.json(data[idx]);
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
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
/**
 * backfill-empcodes.js
 * 
 * Backfills missing empCode and hash into saved_ids.json
 * by matching employeeName against the HRIS employee list.
 * 
 * Run inside the container:
 *   docker exec employee-backend node /app/backend/backfill-empcodes.js
 * 
 * Or locally:
 *   node backend/backfill-empcodes.js
 */

const fs   = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const axios = require('axios');

const DATA_PATH   = path.join(__dirname, 'data');
const IDS_FILE    = path.join(DATA_PATH, 'saved_ids.json');
const HASH_SECRET = process.env.HASH_SECRET || 'avpass-default-secret-change-me';

function hashEmpCode(empCode) {
  return crypto.createHmac('sha256', HASH_SECRET)
    .update(empCode.toLowerCase())
    .digest('hex');
}

// Normalize name for fuzzy matching (uppercase, remove extra spaces/punctuation)
function normalizeName(name) {
  return (name || '').toUpperCase().replace(/[^A-Z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
}

async function getToken() {
  const loginUrl = new URL(process.env.HRIS_URL);
  loginUrl.searchParams.append('key', process.env.HRIS_API_KEY);
  const r = await axios.post(loginUrl.toString(), {
    username: process.env.HRIS_USERNAME,
    password: process.env.HRIS_PASSWORD,
  }, { timeout: 15000 });
  return r.data.token;
}

async function fetchAllEmployees(token) {
  const all = [];
  let page = 0;
  while (true) {
    const url = new URL('https://api.avegabros.org/website/id-employees');
    url.searchParams.append('key', process.env.HRIS_API_KEY);
    url.searchParams.append('limit', '100');
    url.searchParams.append('page', String(page));
    url.searchParams.append('order', 'asc');
    url.searchParams.append('sort', 'id');
    try {
      const r = await axios.get(url.toString(), {
        headers: { 'Authorization': `Bearer ${token}` },
        timeout: 15000,
      });
      const list = Array.isArray(r.data) ? r.data : (r.data?.data ?? []);
      if (list.length === 0) break;
      all.push(...list);
      console.log(`  Fetched page ${page}: ${list.length} employees (total: ${all.length})`);
      if (list.length < 100) break;
      page++;
    } catch (e) {
      console.log(`  Page ${page} failed: ${e.message} — stopping`);
      break;
    }
  }
  return all;
}

async function main() {
  console.log('=== Backfill empCode + hash into saved_ids.json ===\n');

  const savedIds = JSON.parse(fs.readFileSync(IDS_FILE, 'utf8'));
  const missing  = savedIds.filter(e => !e.empCode || !e.hash);
  console.log(`Total saved IDs: ${savedIds.length}`);
  console.log(`Missing empCode: ${missing.length}\n`);

  if (missing.length === 0) {
    console.log('Nothing to backfill. All done!');
    return;
  }

  console.log('Fetching HRIS token...');
  const token = await getToken();
  console.log('Fetching all employees from HRIS...');
  const employees = await fetchAllEmployees(token);
  console.log(`\nTotal HRIS employees: ${employees.length}\n`);

  // Build a normalized name → employee map
  const empByName = new Map();
  for (const emp of employees) {
    const key = normalizeName(emp.full_name);
    empByName.set(key, emp);
  }

  let matched = 0;
  let unmatched = [];

  for (const entry of savedIds) {
    if (entry.empCode && entry.hash) continue; // already has it

    const normalizedSaved = normalizeName(entry.employeeName);
    const emp = empByName.get(normalizedSaved);

    if (emp) {
      entry.empCode = emp.employee_id;
      entry.hash    = hashEmpCode(emp.employee_id);
      matched++;
      console.log(`  ✅ ${entry.employeeName} → ${emp.employee_id} (hash: ${entry.hash.slice(0, 12)}...)`);
    } else {
      unmatched.push(entry.employeeName);
      console.log(`  ❌ No match: "${entry.employeeName}"`);
    }
  }

  fs.writeFileSync(IDS_FILE, JSON.stringify(savedIds, null, 2));
  console.log(`\n=== Done ===`);
  console.log(`Matched:   ${matched}`);
  console.log(`Unmatched: ${unmatched.length}`);
  if (unmatched.length > 0) {
    console.log('\nUnmatched employees (need manual fix or reprint):');
    unmatched.forEach(n => console.log(`  - ${n}`));
  }
}

main().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});

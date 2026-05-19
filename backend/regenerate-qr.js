/**
 * regenerate-qr.js
 * 
 * Regenerates QR codes in all saved IDs using the correct verify URL.
 * Replaces the QR image embedded in the backImg PNG with a fresh one.
 * 
 * Run inside container:
 *   docker exec employee-backend node /app/backend/regenerate-qr.js
 */

const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');
const { createCanvas, loadImage } = require('canvas');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const QRCode = require('qrcode');

const DATA_PATH   = path.join(__dirname, 'data');
const IDS_FILE    = path.join(DATA_PATH, 'saved_ids.json');
const HASH_SECRET = process.env.HASH_SECRET || 'avpass-default-secret-change-me';
const VERIFY_URL  = 'https://employee.abas.ph/verify/';

function hashEmpCode(empCode) {
  return crypto.createHmac('sha256', HASH_SECRET)
    .update(empCode.toLowerCase())
    .digest('hex');
}

async function regenerateQR(empCode) {
  const hash    = hashEmpCode(empCode);
  const fullUrl = VERIFY_URL + hash;
  const dataUrl = await QRCode.toDataURL(fullUrl, {
    width: 200, margin: 1,
    color: { dark: '#000000', light: '#ffffff' },
  });
  return { dataUrl, hash };
}

async function main() {
  console.log('=== Regenerate QR codes in saved_ids.json ===\n');
  console.log(`Verify URL: ${VERIFY_URL}`);
  console.log(`Hash Secret: ${HASH_SECRET.slice(0, 6)}...\n`);

  const savedIds = JSON.parse(fs.readFileSync(IDS_FILE, 'utf8'));
  console.log(`Total saved IDs: ${savedIds.length}\n`);

  let updated = 0;
  let skipped = 0;

  for (const entry of savedIds) {
    if (!entry.empCode) {
      console.log(`  ⚠️  SKIP (no empCode): ${entry.employeeName}`);
      skipped++;
      continue;
    }

    try {
      const { dataUrl, hash } = await regenerateQR(entry.empCode);

      // Update the hash stored in the entry
      entry.hash = hash;

      // Replace QR in backImg:
      // Load the existing back image, find where the QR was, draw new QR over it
      if (entry.backImg) {
        const CARD_W = 638;
        const CARD_H = 1010;

        // Default QR position (matches IDBuilder defaults)
        const qrSize = 70 / 100 * CARD_W;  // qrSize=70%
        const qrX    = 50 / 100 * CARD_W - qrSize / 2;  // qrX=50%
        const qrY    = 42 / 100 * CARD_H - qrSize / 2;  // qrY=42%

        const canvas  = createCanvas(CARD_W, CARD_H);
        const ctx     = canvas.getContext('2d');

        // Draw existing back image
        const existing = await loadImage(entry.backImg);
        ctx.drawImage(existing, 0, 0, CARD_W, CARD_H);

        // Draw new QR over it
        const qrImg = await loadImage(dataUrl);
        ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

        entry.backImg = canvas.toDataURL('image/png');
      }

      console.log(`  ✅ ${entry.employeeName} (${entry.empCode}) → hash: ${hash.slice(0, 12)}...`);
      updated++;
    } catch (err) {
      console.log(`  ❌ ERROR for ${entry.employeeName}: ${err.message}`);
    }
  }

  fs.writeFileSync(IDS_FILE, JSON.stringify(savedIds, null, 2));

  console.log(`\n=== Done ===`);
  console.log(`Updated: ${updated}`);
  console.log(`Skipped (no empCode): ${skipped}`);
  console.log(`\nNote: ${skipped} entries still need empCode — run backfill-empcodes.js first, then re-run this script.`);
}

main().catch(e => {
  console.error('Fatal error:', e.message);
  process.exit(1);
});

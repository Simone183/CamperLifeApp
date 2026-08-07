const fs = require('fs');

const raw = process.env.KEYSTORE_B64 || '';
if (!raw.trim()) {
  console.log('⚠️ Secret RELEASE_KEYSTORE_BASE64 non presente. Fallback debug.');
  process.exit(0);
}

try {
  // Clean quotes, newlines, spaces
  let cleaned = raw.trim().replace(/^["'\s]+|["'\s]+$/g, '').replace(/[\r\n\t ]/g, '');
  // Normalize URL-safe base64 if present
  cleaned = cleaned.replace(/-/g, '+').replace(/_/g, '/');
  
  const buf = Buffer.from(cleaned, 'base64');
  if (buf.length < 100) {
    console.log(`⚠️ RELEASE_KEYSTORE_BASE64 generato ha solo ${buf.length} bytes (troppo corto o non valido). Fallback debug.`);
    process.exit(0);
  }
  fs.writeFileSync('android/app/release.keystore', buf);
  console.log(`✅ Keystore decodificato con successo (${buf.length} bytes)`);
} catch (err) {
  console.log('⚠️ Errore decodifica Keystore Base64:', err.message);
}


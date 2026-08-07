const fs = require('fs');

const raw = process.env.KEYSTORE_B64 || '';
if (!raw.trim()) {
  console.log('⚠️ Secret RELEASE_KEYSTORE_BASE64 non presente. Fallback debug.');
  process.exit(0);
}

try {
  // Clean whitespace, line breaks, quotes
  const cleaned = raw.trim().replace(/^["'\s]+|["'\s]+$/g, '').replace(/[^A-Za-z0-9+/=]/g, '');
  const buf = Buffer.from(cleaned, 'base64');
  if (buf.length < 100) {
    console.log('⚠️ RELEASE_KEYSTORE_BASE64 troppo corto o non valido. Fallback debug.');
    process.exit(0);
  }
  fs.writeFileSync('android/app/release.keystore', buf);
  console.log(`✅ Keystore decodificato con successo (${buf.length} bytes)`);
} catch (err) {
  console.log('⚠️ Errore decodifica Keystore Base64:', err.message);
}

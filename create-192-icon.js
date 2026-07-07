const sharp = require('sharp');
sharp('public/logo.png').resize(192, 192).toFile('public/logo-192x192.png').then(() => console.log('Done')).catch(err => console.error(err));

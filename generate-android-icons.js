import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const publicDir = path.join(process.cwd(), 'public');
const androidResDir = path.join(process.cwd(), 'android', 'app', 'src', 'main', 'res');

// Find the best source file
const possibleSources = [
  path.join(publicDir, 'icon.png'),
  path.join(publicDir, 'logo.png'),
  path.join(process.cwd(), 'icon.png'),
  path.join(process.cwd(), 'logo.png'),
  path.join(publicDir, 'logo.svg') // Fallback to current logo.svg
];

let srcPath = null;
for (const p of possibleSources) {
  if (fs.existsSync(p)) {
    srcPath = p;
    break;
  }
}

if (!srcPath) {
  console.error("No source icon found! Please upload a logo.png, icon.png, or logo.svg to your public folder.");
  process.exit(1);
}

console.log(`Using source icon: ${srcPath}`);

const mipmaps = [
  { name: 'mipmap-mdpi', size: 48, foreground: 108 },
  { name: 'mipmap-hdpi', size: 72, foreground: 162 },
  { name: 'mipmap-xhdpi', size: 96, foreground: 216 },
  { name: 'mipmap-xxhdpi', size: 144, foreground: 324 },
  { name: 'mipmap-xxxhdpi', size: 192, foreground: 432 }
];

async function generate() {
  for (const m of mipmaps) {
    const targetDir = path.join(androidResDir, m.name);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // 1. Generate ic_launcher.png (square)
    await sharp(srcPath)
      .resize(m.size, m.size)
      .png()
      .toFile(path.join(targetDir, 'ic_launcher.png'));

    // 2. Generate ic_launcher_round.png (round icon with circular mask)
    const circleSvg = Buffer.from(
      `<svg><circle cx="${m.size / 2}" cy="${m.size / 2}" r="${m.size / 2}" fill="black"/></svg>`
    );
    await sharp(srcPath)
      .resize(m.size, m.size)
      .composite([{ input: circleSvg, blend: 'dest-in' }])
      .png()
      .toFile(path.join(targetDir, 'ic_launcher_round.png'));

    // 3. Generate ic_launcher_foreground.png (with ~65% safe-zone centering)
    const fgSize = Math.round(m.foreground * 0.65);
    const resizedFg = await sharp(srcPath)
      .resize(fgSize, fgSize, { fit: 'inside' })
      .toBuffer();

    await sharp({
      create: {
        width: m.foreground,
        height: m.foreground,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    })
      .composite([{ input: resizedFg, gravity: 'center' }])
      .png()
      .toFile(path.join(targetDir, 'ic_launcher_foreground.png'));

    console.log(`Generated launcher icons for ${m.name}`);
  }

  console.log("Success! All Android launcher icons have been successfully updated.");
}

generate().catch(err => {
  console.error("Error generating launcher icons:", err);
});
